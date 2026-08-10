import type {
  CompaniesListData,
  CompaniesMapData,
  FacetsResponse,
  JobsListData,
  SearchResponse,
  SubmitCompanyBody,
} from "@chowk/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppServer, buildApp } from "../src/app";
import { SESSION_COOKIE } from "../src/plugins/auth";

/*
  One block per bug that got fixed. Each of these failed against the code as it
  stood, so they are here to stop the same mistake coming back rather than to
  describe a feature.

  Runs against the seeded development database. Rows created here carry the
  test slug prefix and are removed again; seed data is never touched.
*/

let app: AppServer;
let cookie: string;
let userId: string;

const TEST_EMAIL = "vitest-regressions@chowk.test";
const TEST_SLUG_PREFIX = "regression-test";

async function get<T>(url: string): Promise<T> {
  const response = await app.inject({ method: "GET", url });
  const body = response.json();
  if (!body.success) throw new Error(`${url} → ${JSON.stringify(body.error)}`);
  return body.data as T;
}

function sum(buckets: { count: number }[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

const auth = () => ({ [SESSION_COOKIE]: cookie });

/* A crashed run can leave rows behind, so clear them before and after. */
async function removeTestRows() {
  await app.prisma.company.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
  await app.prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  app = await buildApp();
  await app.ready();
  await removeTestRows();

  const registered = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { email: TEST_EMAIL, password: "Password123!", name: "Vitest Regressions" },
  });
  cookie = registered.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? "";

  const user = await app.prisma.user.findUniqueOrThrow({ where: { email: TEST_EMAIL } });
  userId = user.id;
});

afterAll(async () => {
  if (app) {
    await removeTestRows();
    await app.close();
  }
});

/*
  Fix 1 — orderBy for both sorts gained an { id: "asc" } tiebreaker.

  Hundreds of jobs share a salary band or a posting date. Without a total order
  the database may return tied rows in a different sequence for each LIMIT/OFFSET
  window, so paging through the list silently repeated some rows and dropped
  others.
*/
describe("paging through a sorted list", () => {
  async function walk(sort: "salary" | "recent", pageSize: number, filter = "") {
    const query = `sort=${sort}${filter ? `&${filter}` : ""}`;
    const { total } = await get<JobsListData>(`/api/jobs?${query}&pageSize=1`);
    const ids: string[] = [];

    for (let page = 1; page <= Math.ceil(total / pageSize); page += 1) {
      const data = await get<JobsListData>(`/api/jobs?${query}&page=${page}&pageSize=${pageSize}`);
      ids.push(...data.items.map((job) => job.id));
    }

    return { total, ids };
  }

  it("visits every job exactly once, sorted by salary", async () => {
    const { total, ids } = await walk("salary", 25);

    expect(total).toBeGreaterThan(0);
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  it("visits every job exactly once, sorted by recency", async () => {
    const { total, ids } = await walk("recent", 25);

    expect(total).toBeGreaterThan(0);
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  /* Filtering bunches the shared postedAt values together, where ties bite hardest. */
  it("visits every job exactly once on a narrowed, recency-sorted list", async () => {
    const { total, ids } = await walk("recent", 10, "workMode=REMOTE");

    expect(total).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(total);
  });
});

/*
  Fix 2 — compileOfficeWhere now applies the job-level filter to offices, and
  the map route stopped re-deciding the same thing afterwards.

  The facet panel counted every office of a matching company while the map drew
  only the offices holding a matching role, so the city list offered places the
  map then refused to pin.
*/
describe("city and country facets against the pins the map draws", () => {
  const filters = ["department=design", "workMode=REMOTE", "department=design&workMode=REMOTE"];

  it.each(filters)("matches every bucket for ?%s", async (filter) => {
    const facets = await get<FacetsResponse>(`/api/facets?${filter}`);

    expect(facets.city.length).toBeGreaterThan(0);
    expect(facets.country.length).toBeGreaterThan(0);

    for (const bucket of facets.city) {
      const map = await get<CompaniesMapData>(
        `/api/companies/map?${filter}&city=${encodeURIComponent(bucket.value)}`,
      );
      expect({ city: bucket.value, pins: map.offices.length }).toEqual({
        city: bucket.value,
        pins: bucket.count,
      });
    }

    for (const bucket of facets.country) {
      const map = await get<CompaniesMapData>(
        `/api/companies/map?${filter}&country=${encodeURIComponent(bucket.value)}`,
      );
      expect({ country: bucket.value, pins: map.offices.length }).toEqual({
        country: bucket.value,
        pins: bucket.count,
      });
    }
  });

  it.each(filters)("counts each pin under exactly one city for ?%s", async (filter) => {
    const [facets, map] = await Promise.all([
      get<FacetsResponse>(`/api/facets?${filter}`),
      get<CompaniesMapData>(`/api/companies/map?${filter}`),
    ]);

    expect(sum(facets.city)).toBe(map.offices.length);
  });
});

/*
  Fix 3 — authenticate and requireAdmin load the user row instead of trusting
  the token's claims.

  A token lives seven days. Trusting it alone let a deleted account keep using
  the site and a demoted admin keep the review queue until the token expired.
*/
describe("a session token whose account is gone", () => {
  const PROTECTED = [
    "/api/resumes",
    "/api/applications",
    "/api/submissions/mine",
    "/api/admin/submissions",
  ];

  it.each(PROTECTED)("turns away %s", async (url) => {
    // Signed by this server and unexpired, so only the missing row can reject it.
    const token = app.jwt.sign({ sub: "usr_deleted_last_week", role: "USER" });
    const response = await app.inject({
      method: "GET",
      url,
      cookies: { [SESSION_COOKIE]: token },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("ignores an ADMIN claim when the row says USER", async () => {
    const token = app.jwt.sign({ sub: userId, role: "ADMIN" });
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/submissions",
      cookies: { [SESSION_COOKIE]: token },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN");
  });
});

/*
  Fix 4 — escapeLike, applied everywhere a search term reaches `contains`.

  Prisma compiles `contains` to LIKE without escaping, so "%" matched every row
  instead of none. Someone searching "50% off" got the entire dataset back.
*/
describe("wildcard characters typed into a search box", () => {
  it("finds no company for a term that is only wildcards", async () => {
    // %25 is a literal percent sign once the query string is decoded.
    const [underscores, percent] = await Promise.all([
      get<CompaniesListData>("/api/companies?pageSize=1&q=__"),
      get<CompaniesListData>("/api/companies?pageSize=1&q=%25"),
    ]);

    expect(underscores.total).toBe(0);
    expect(percent.total).toBe(0);
  });

  it("returns empty groups for a wildcard command-palette query", async () => {
    const results = await get<SearchResponse>("/api/search?q=%25%25");

    expect(results.companies).toEqual([]);
    expect(results.jobs).toEqual([]);
    expect(results.locations).toEqual([]);
  });

  it("still matches a real name", async () => {
    const [first] = (await get<CompaniesListData>("/api/companies?pageSize=1")).items;
    const hits = await get<CompaniesListData>(
      `/api/companies?pageSize=50&q=${encodeURIComponent(first.name)}`,
    );

    expect(hits.items.some((company) => company.id === first.id)).toBe(true);
  });
});

/*
  Fix 5 — PUT /api/applications requires the job's company to be visible too.

  Checking only the job meant replaying an old job id returned the whole role —
  title, salary, company — for a company that had since been hidden or removed.
*/
describe("saving a job whose company is not public", () => {
  it("refuses while the company is pending or deleted, and allows it once approved", async () => {
    const department = await app.prisma.department.findFirstOrThrow();
    const company = await app.prisma.company.create({
      data: {
        slug: `${TEST_SLUG_PREFIX}-hidden-co`,
        name: "Regression Test Hidden Co",
        description: "Throwaway company row created by the regression suite.",
        submissionStatus: "PENDING",
        jobs: {
          create: {
            departmentId: department.id,
            title: "Regression Test Role",
            description: "Throwaway job row created by the regression suite.",
            workMode: "REMOTE",
          },
        },
      },
      include: { jobs: { select: { id: true } } },
    });
    const jobId = company.jobs[0].id;

    const save = () =>
      app.inject({ method: "PUT", url: "/api/applications", cookies: auth(), payload: { jobId } });

    try {
      const pending = await save();
      expect(pending.statusCode).toBe(404);
      expect(pending.json().error.code).toBe("NOT_FOUND");

      await app.prisma.company.update({
        where: { id: company.id },
        data: { submissionStatus: "APPROVED", deletedAt: new Date() },
      });
      expect((await save()).statusCode).toBe(404);

      // Same open job, now on a public company — so it was the company that blocked it.
      await app.prisma.company.update({ where: { id: company.id }, data: { deletedAt: null } });
      expect((await save()).statusCode).toBe(200);
    } finally {
      // Deleting the company cascades to its jobs and their applications.
      await app.prisma.company.delete({ where: { id: company.id } });
    }
  });
});

/*
  Fix 6 — a submission with two offices flagged isHq yields exactly one HQ.

  The map counts a company's remote roles against its head office, so a second
  HQ pin counted every remote role twice.
*/
describe("a submission that flags two head offices", () => {
  it("stores exactly one", async () => {
    const payload = {
      name: "Regression Test Two HQ Co",
      description: "Throwaway submission created by the regression suite.",
      industries: [],
      hiringStatus: "ACTIVELY_HIRING",
      offices: [
        { city: "Pune", country: "India", lat: 18.52, lng: 73.86, isHq: true },
        { city: "Mumbai", country: "India", lat: 19.08, lng: 72.88, isHq: true },
      ],
      founders: [],
    } satisfies SubmitCompanyBody;

    const response = await app.inject({
      method: "POST",
      url: "/api/companies/submit",
      cookies: auth(),
      payload,
    });
    expect(response.statusCode).toBe(201);

    const companyId: string = response.json().data.companyId;

    try {
      const offices = await app.prisma.office.findMany({
        where: { companyId },
        select: { city: true, isHq: true },
      });

      expect(offices).toHaveLength(2);
      expect(offices.filter((office) => office.isHq)).toHaveLength(1);
    } finally {
      await app.prisma.company.delete({ where: { id: companyId } });
    }
  });
});

/*
  Fix 7 — a blank filter value is ignored rather than compiled.

  `?city=` arrives as [""] and used to compile to `city IN ('')`, so a stale or
  hand-edited URL showed an empty site with no way to tell why.
*/
describe("a blank filter value in the URL", () => {
  it.each(["city", "country", "department"])("changes nothing for ?%s=", async (key) => {
    const [all, blank] = await Promise.all([
      get<JobsListData>("/api/jobs?pageSize=1"),
      get<JobsListData>(`/api/jobs?pageSize=1&${key}=`),
    ]);

    expect(all.total).toBeGreaterThan(0);
    expect(blank.total).toBe(all.total);
  });

  /*
    workMode is an enum, so a blank one is rejected by request validation and
    never reaches the filter compiler. The compiler-side guard for it is unit
    tested in compile-filters.test.ts.
  */
  it("is rejected by validation for ?workMode=", async () => {
    const response = await app.inject({ method: "GET", url: "/api/jobs?workMode=" });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});
