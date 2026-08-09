import type { CompaniesMapData, FacetsResponse, JobsListData } from "@chowk/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AppServer, buildApp } from "../src/app";

/*
  Runs against the seeded development database. These cover the behaviour that
  only shows up once real rows are involved: facet counts reconciling, hidden
  rows staying hidden, and the save/apply upsert keeping one row per job.

  Everything created here is cleaned up afterwards; nothing else is mutated.
*/

let app: AppServer;
const TEST_EMAIL = "vitest-user@chowk.test";

async function get<T>(url: string): Promise<T> {
  const response = await app.inject({ method: "GET", url });
  const body = response.json();
  if (!body.success) throw new Error(`${url} → ${JSON.stringify(body.error)}`);
  return body.data as T;
}

function sum(buckets: { count: number }[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  app = await buildApp();
  await app.ready();
  await app.prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
});

afterAll(async () => {
  if (app) {
    await app.prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  }
});

describe("facet counts", () => {
  it("each dimension sums to its own population", async () => {
    const facets = await get<FacetsResponse>("/api/facets");
    const companies = await get<{ total: number }>("/api/companies?pageSize=1");
    const jobs = await get<JobsListData>("/api/jobs?pageSize=1");
    const map = await get<CompaniesMapData>("/api/companies/map");

    expect(sum(facets.hiringStatus)).toBe(companies.total);
    expect(sum(facets.fundingStage)).toBe(companies.total);
    expect(sum(facets.workMode)).toBe(jobs.total);
    expect(sum(facets.department)).toBe(jobs.total);
    expect(sum(facets.country)).toBe(map.offices.length);
    expect(sum(facets.city)).toBe(map.offices.length);
  });

  it("selecting a value leaves its siblings counted", async () => {
    const before = await get<FacetsResponse>("/api/facets");
    const after = await get<FacetsResponse>("/api/facets?workMode=REMOTE");

    // A dimension ignores its own filter, so its numbers do not move at all.
    expect(after.workMode).toEqual(before.workMode);
    expect(after.workMode.filter((bucket) => bucket.value !== "REMOTE").every((b) => b.count > 0)).toBe(
      true,
    );
  });

  it("narrows the other dimensions", async () => {
    const facets = await get<FacetsResponse>("/api/facets?workMode=REMOTE");
    const remoteJobs = await get<JobsListData>("/api/jobs?pageSize=1&workMode=REMOTE");

    expect(sum(facets.department)).toBe(remoteJobs.total);
    expect(remoteJobs.total).toBeGreaterThan(0);
  });
});

describe("filter semantics", () => {
  it("ORs repeated values inside one dimension", async () => {
    const [remote, hybrid, both] = await Promise.all([
      get<JobsListData>("/api/jobs?pageSize=1&workMode=REMOTE"),
      get<JobsListData>("/api/jobs?pageSize=1&workMode=HYBRID"),
      get<JobsListData>("/api/jobs?pageSize=1&workMode=REMOTE&workMode=HYBRID"),
    ]);

    expect(both.total).toBe(remote.total + hybrid.total);
  });

  it("ANDs across dimensions", async () => {
    const [remote, design, both] = await Promise.all([
      get<JobsListData>("/api/jobs?pageSize=1&workMode=REMOTE"),
      get<JobsListData>("/api/jobs?pageSize=1&department=design"),
      get<JobsListData>("/api/jobs?pageSize=1&workMode=REMOTE&department=design"),
    ]);

    expect(both.total).toBeLessThanOrEqual(Math.min(remote.total, design.total));
  });
});

describe("the map endpoint", () => {
  it("counts every open role exactly once across the pins", async () => {
    const map = await get<CompaniesMapData>("/api/companies/map");
    const jobs = await get<JobsListData>("/api/jobs?pageSize=1");

    const pinned = map.offices.reduce((total, office) => total + office.openJobCount, 0);
    expect(pinned).toBe(jobs.total);
  });

  it("never returns a pending or deleted company", async () => {
    const map = await get<CompaniesMapData>("/api/companies/map");
    const hiddenCompanies = await app.prisma.company.findMany({
      where: { OR: [{ submissionStatus: { not: "APPROVED" } }, { deletedAt: { not: null } }] },
      select: { id: true },
    });

    const visibleIds = new Set(map.offices.map((office) => office.companyId));
    for (const company of hiddenCompanies) expect(visibleIds.has(company.id)).toBe(false);
  });

  it("drops pins with no matching role once a job filter is on", async () => {
    const filtered = await get<CompaniesMapData>("/api/companies/map?department=design");

    expect(filtered.offices.length).toBeGreaterThan(0);
    expect(filtered.offices.every((office) => office.openJobCount > 0)).toBe(true);
  });

  it("keeps quiet offices on the map when nothing is filtered", async () => {
    const all = await get<CompaniesMapData>("/api/companies/map");
    expect(all.offices.some((office) => office.openJobCount === 0)).toBe(true);
  });
});

describe("saving and applying", () => {
  let cookie: string;
  let jobId: string;

  beforeAll(async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: TEST_EMAIL, password: "Password123!", name: "Vitest" },
    });
    cookie = registered.cookies.find((c) => c.name === "chowk_session")?.value ?? "";

    const jobs = await get<JobsListData>("/api/jobs?pageSize=1");
    jobId = jobs.items[0].id;
  });

  const auth = () => ({ chowk_session: cookie });

  it("saves once no matter how many times the button is pressed", async () => {
    const first = await app.inject({
      method: "PUT",
      url: "/api/applications",
      cookies: auth(),
      payload: { jobId },
    });
    const second = await app.inject({
      method: "PUT",
      url: "/api/applications",
      cookies: auth(),
      payload: { jobId },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    // Same row both times — the unique (userId, jobId) index makes it an upsert.
    expect(second.json().data.application.id).toBe(first.json().data.application.id);
    expect(second.json().data.application.status).toBe("SAVED");
  });

  it("keeps one row when a saved job is applied to, and stamps appliedAt once", async () => {
    const applied = await app.inject({
      method: "PATCH",
      url: "/api/applications",
      cookies: auth(),
      payload: { jobId, status: "APPLIED" },
    });
    const first = applied.json().data.application;
    expect(first.status).toBe("APPLIED");
    expect(first.appliedAt).not.toBeNull();

    const moved = await app.inject({
      method: "PATCH",
      url: "/api/applications",
      cookies: auth(),
      payload: { jobId, status: "INTERVIEWING" },
    });
    const second = moved.json().data.application;

    expect(second.id).toBe(first.id);
    expect(second.status).toBe("INTERVIEWING");
    // The date records when they first applied and does not move again.
    expect(second.appliedAt).toBe(first.appliedAt);

    const list = await app.inject({ method: "GET", url: "/api/applications", cookies: auth() });
    expect(list.json().data.items.filter((row: { jobId: string }) => row.jobId === jobId)).toHaveLength(
      1,
    );
  });

  it("refuses to touch someone else's list", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/applications",
      payload: { jobId },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });
});
