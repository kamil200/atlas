import type { FilterParams } from "@atlas/schema";
import { describe, expect, it } from "vitest";
import {
  compileCompanyWhere,
  compileJobWhere,
  compileOfficeWhere,
  escapeLike,
  hasJobLevelFilter,
  VISIBLE_COMPANY,
  VISIBLE_JOB,
} from "../src/modules/filters/compile-filters";

/*
  The highest-value tests in the repo. Every filtered endpoint compiles its
  query here, so a mistake in this module shows up as the map, the list, and
  the facet counts quietly disagreeing rather than as an obvious crash.
*/

/* Digs a key out of the nested AND array so assertions stay readable. */
function clauses(where: { AND?: unknown }): Record<string, unknown>[] {
  return (where.AND ?? []) as Record<string, unknown>[];
}

function findClause(where: { AND?: unknown }, key: string) {
  return clauses(where).find((clause) => key in clause);
}

describe("visibility base", () => {
  it("hides pending and deleted companies even with no filters", () => {
    const where = compileCompanyWhere({});
    expect(clauses(where)).toContainEqual(VISIBLE_COMPANY);
  });

  it("only ever returns open, undeleted jobs", () => {
    const where = compileJobWhere({});
    expect(clauses(where)).toContainEqual(VISIBLE_JOB);
  });

  it("keeps the visibility base no matter which dimension is omitted", () => {
    for (const omit of ["hiringStatus", "workMode", "city", "investors"] as const) {
      expect(
        clauses(compileCompanyWhere({ hiringStatus: ["ACTIVELY_HIRING"] }, { omit })),
      ).toContainEqual(VISIBLE_COMPANY);
    }
  });
});

describe("OR within a dimension", () => {
  it("puts repeated values into a single `in` list", () => {
    const where = compileCompanyWhere({ fundingStage: ["SEED", "SERIES_A"] });
    expect(findClause(where, "fundingStage")).toEqual({
      fundingStage: { in: ["SEED", "SERIES_A"] },
    });
  });

  it("treats several cities as alternatives on one office", () => {
    const where = compileCompanyWhere({ city: ["Bengaluru", "Pune"] });
    expect(findClause(where, "offices")).toEqual({
      offices: { some: { deletedAt: null, city: { in: ["Bengaluru", "Pune"] } } },
    });
  });
});

describe("AND across dimensions", () => {
  it("adds one clause per dimension", () => {
    const filters: FilterParams = {
      hiringStatus: ["ACTIVELY_HIRING"],
      fundingStage: ["SERIES_A"],
      city: ["Bengaluru"],
      department: ["design"],
    };
    const where = compileCompanyWhere(filters);

    expect(findClause(where, "hiringStatus")).toBeDefined();
    expect(findClause(where, "fundingStage")).toBeDefined();
    expect(findClause(where, "offices")).toBeDefined();
    expect(findClause(where, "jobs")).toBeDefined();
  });

  it("requires one job to match every job-level filter, not one job each", () => {
    const where = compileCompanyWhere({ department: ["design"], workMode: ["REMOTE"] });
    const jobClause = findClause(where, "jobs") as {
      jobs: { some: Record<string, unknown> };
    };

    // A single `some` means the same job satisfies both halves.
    expect(jobClause.jobs.some).toMatchObject({
      status: "OPEN",
      deletedAt: null,
      workMode: { in: ["REMOTE"] },
      department: { slug: { in: ["design"] } },
    });
  });

  it("puts country and city on the same office", () => {
    const where = compileCompanyWhere({ country: ["India"], city: ["Pune"] });
    expect(findClause(where, "offices")).toEqual({
      offices: { some: { deletedAt: null, country: { in: ["India"] }, city: { in: ["Pune"] } } },
    });
  });
});

describe("omit", () => {
  it("drops exactly the named dimension and keeps the rest", () => {
    const filters: FilterParams = {
      workMode: ["REMOTE"],
      department: ["design"],
      hiringStatus: ["ACTIVELY_HIRING"],
    };

    const where = compileJobWhere(filters, { omit: "workMode" });
    const flat = JSON.stringify(where);

    expect(flat).not.toContain("REMOTE");
    expect(flat).toContain("design");
    expect(flat).toContain("ACTIVELY_HIRING");
  });

  it("maps the investors facet onto the investorId param", () => {
    const filters: FilterParams = { investorId: ["inv_0001"], city: ["Mumbai"] };

    expect(JSON.stringify(compileCompanyWhere(filters, { omit: "investors" }))).not.toContain(
      "inv_0001",
    );
    // The other dimension survives.
    expect(JSON.stringify(compileCompanyWhere(filters, { omit: "investors" }))).toContain("Mumbai");
  });

  it("leaves everything in place when nothing is omitted", () => {
    const filters: FilterParams = { workMode: ["REMOTE"] };
    expect(JSON.stringify(compileJobWhere(filters))).toContain("REMOTE");
  });
});

describe("job location", () => {
  it("counts a remote job as sitting at its company's head office", () => {
    const where = compileJobWhere({ city: ["Bengaluru"] });
    const locationClause = clauses(where).find((clause) => "OR" in clause) as {
      OR: Record<string, unknown>[];
    };

    expect(locationClause.OR).toHaveLength(2);
    // Pinned to an office in that city...
    expect(locationClause.OR[0]).toEqual({
      office: { deletedAt: null, city: { in: ["Bengaluru"] } },
    });
    // ...or unpinned, with the HQ there.
    expect(locationClause.OR[1]).toEqual({
      officeId: null,
      company: { offices: { some: { deletedAt: null, city: { in: ["Bengaluru"] }, isHq: true } } },
    });
  });

  it("adds no location clause when no place is chosen", () => {
    expect(clauses(compileJobWhere({})).some((clause) => "OR" in clause)).toBe(false);
  });
});

describe("offices", () => {
  it("narrows to the chosen place and to visible companies", () => {
    const where = compileOfficeWhere({ city: ["Pune"] });
    expect(where.deletedAt).toBeNull();
    expect(where.city).toEqual({ in: ["Pune"] });
    expect(where.company).toBeDefined();
  });

  /*
    An office earns a pin only if it holds a matching role, or it is the HQ and
    the company has a matching remote one. The map used to re-decide this after
    the query and the two rules drifted, so a facet offered a city the map then
    drew no pin for.
  */
  it("requires a matching role once a job-level filter is on", () => {
    const where = compileOfficeWhere({ department: ["design"] });

    expect(where.OR).toEqual([
      { jobs: { some: { ...VISIBLE_JOB, department: { slug: { in: ["design"] } } } } },
      {
        isHq: true,
        company: {
          jobs: {
            some: { ...VISIBLE_JOB, department: { slug: { in: ["design"] } }, officeId: null },
          },
        },
      },
    ]);
  });

  it("adds no role requirement when only a place is chosen", () => {
    expect(compileOfficeWhere({ city: ["Pune"] }).OR).toBeUndefined();
  });
});

describe("hasJobLevelFilter", () => {
  it("is true only for work mode and department", () => {
    expect(hasJobLevelFilter({})).toBe(false);
    expect(hasJobLevelFilter({ city: ["Pune"] })).toBe(false);
    expect(hasJobLevelFilter({ hiringStatus: ["ACTIVELY_HIRING"] })).toBe(false);
    expect(hasJobLevelFilter({ workMode: ["REMOTE"] })).toBe(true);
    expect(hasJobLevelFilter({ department: ["design"] })).toBe(true);
  });

  it("ignores empty arrays, which is what an unticked box leaves behind", () => {
    expect(hasJobLevelFilter({ workMode: [], department: [] })).toBe(false);
  });

  /*
    A blank value is not a filter. `?workMode=` arrives as [""] and used to
    compile to `workMode IN ('')`, emptying the site for anyone on a stale URL.
    The enum in FilterParams cannot express a blank one, hence the cast.
  */
  it("ignores a blank value, which is what a hand-edited URL leaves behind", () => {
    const blank = { workMode: [""], department: [" "] } as unknown as FilterParams;

    expect(hasJobLevelFilter(blank)).toBe(false);
    expect(JSON.stringify(compileJobWhere(blank))).not.toContain('""');
  });
});

describe("free-text search", () => {
  it("looks at the company name, its tagline, and its job titles", () => {
    const where = compileCompanyWhere({ q: "payments" });
    const textClause = clauses(where).find((clause) => "OR" in clause) as {
      OR: Record<string, unknown>[];
    };
    expect(textClause.OR).toHaveLength(3);
  });

  it("ignores whitespace-only input", () => {
    expect(clauses(compileCompanyWhere({ q: "   " })).some((clause) => "OR" in clause)).toBe(false);
  });

  it("hands the database an escaped term, so a typed wildcard stays literal", () => {
    const company = clauses(compileCompanyWhere({ q: "50% off" })).find(
      (clause) => "OR" in clause,
    ) as { OR: Record<string, unknown>[] };
    const job = clauses(compileJobWhere({ q: "50% off" })).find((clause) => "OR" in clause) as {
      OR: Record<string, unknown>[];
    };

    expect(company.OR[0]).toEqual({ name: { contains: "50\\% off", mode: "insensitive" } });
    expect(job.OR[0]).toEqual({ title: { contains: "50\\% off", mode: "insensitive" } });
  });
});

/*
  Prisma compiles `contains` to LIKE without escaping. A search for "%" then
  matched every row instead of none, which is the opposite of what someone
  typing "50% off" or "node_modules" expects.
*/
describe("escapeLike", () => {
  it("escapes the three characters LIKE treats as special", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("node_modules")).toBe("node\\_modules");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  it("escapes every occurrence, not just the first", () => {
    expect(escapeLike("%_%")).toBe("\\%\\_\\%");
  });

  it("leaves ordinary text exactly as typed", () => {
    expect(escapeLike("Razorpay design")).toBe("Razorpay design");
    expect(escapeLike("")).toBe("");
  });
});
