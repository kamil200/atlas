import type { JobSummary } from "@atlas/schema";
import { describe, expect, it } from "vitest";
import { deriveSalaryBands, deriveStats, freshSince } from "../src/modules/companies/derive-stats";

/*
  Pure functions over a list of roles, so these need no database and no server.
  `now` is fixed rather than read from the clock, or the week buckets would
  drift with the time of day the suite happens to run.
*/

const NOW = new Date("2026-08-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function job(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    id: "job_1",
    title: "Backend Engineer",
    companyId: "co_1",
    companySlug: "razorpay",
    companyName: "Razorpay",
    companyLogoUrl: null,
    departmentName: "Engineering",
    departmentSlug: "engineering",
    city: "Bengaluru",
    country: "India",
    workMode: "ONSITE",
    seniority: "MID",
    skills: [],
    salaryMin: 2_000_000,
    salaryMax: 4_000_000,
    currency: "INR",
    status: "OPEN",
    hasExternalApply: false,
    postedAt: daysAgo(1),
    ...overrides,
  };
}

describe("deriveStats", () => {
  it("counts roles, cities and departments without double counting", () => {
    const stats = deriveStats(
      [
        job({ id: "a", city: "Bengaluru", departmentSlug: "engineering" }),
        job({ id: "b", city: "Bengaluru", departmentSlug: "design" }),
        job({ id: "c", city: "Pune", departmentSlug: "engineering" }),
      ],
      NOW,
    );

    expect(stats.openJobCount).toBe(3);
    expect(stats.cityCount).toBe(2);
    expect(stats.departmentCount).toBe(2);
  });

  it("treats a remote role with no city as no city rather than a blank one", () => {
    const stats = deriveStats([job({ city: null, country: null })], NOW);
    expect(stats.cityCount).toBe(0);
  });

  it("counts only the last seven days as posted this week", () => {
    const stats = deriveStats(
      [job({ id: "a", postedAt: daysAgo(0) }), job({ id: "b", postedAt: daysAgo(6) })],
      NOW,
    );
    expect(stats.postedThisWeek).toBe(2);

    const older = deriveStats([job({ postedAt: daysAgo(8) })], NOW);
    expect(older.postedThisWeek).toBe(0);
  });

  it("puts this week in the last bucket and eight weeks ago in the first", () => {
    const stats = deriveStats(
      [job({ id: "a", postedAt: daysAgo(0) }), job({ id: "b", postedAt: daysAgo(7 * 7 + 1) })],
      NOW,
    );

    expect(stats.weeklyPostings).toHaveLength(8);
    expect(stats.weeklyPostings[7]).toBe(1);
    expect(stats.weeklyPostings[0]).toBe(1);
  });

  it("drops anything older than the window instead of piling it into the first bar", () => {
    // An old company would otherwise look like it had a hiring spree two months ago.
    const stats = deriveStats([job({ postedAt: daysAgo(400) })], NOW);
    expect(stats.weeklyPostings).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(stats.openJobCount).toBe(1);
  });
});

describe("deriveSalaryBands", () => {
  it("groups by level and reports the real floor, median and ceiling", () => {
    const bands = deriveSalaryBands([
      job({ id: "a", seniority: "MID", salaryMin: 2_000_000, salaryMax: 3_000_000 }),
      job({ id: "b", seniority: "MID", salaryMin: 3_000_000, salaryMax: 5_000_000 }),
    ]);

    expect(bands).toHaveLength(1);
    expect(bands[0]?.seniority).toBe("Mid");
    expect(bands[0]?.jobCount).toBe(2);
    expect(bands[0]?.minSalary).toBe(2_000_000);
    expect(bands[0]?.maxSalary).toBe(5_000_000);
    // Midpoints are 2.5M and 4M, so the median of two values is their mean.
    expect(bands[0]?.medianSalary).toBe(3_250_000);
  });

  it("leaves out roles with no advertised salary", () => {
    // One silent job would otherwise drag the band's floor down to zero.
    const bands = deriveSalaryBands([
      job({ id: "a", seniority: "MID", salaryMin: 2_000_000, salaryMax: 3_000_000 }),
      job({ id: "b", seniority: "MID", salaryMin: null, salaryMax: null }),
    ]);

    expect(bands[0]?.jobCount).toBe(1);
    expect(bands[0]?.minSalary).toBe(2_000_000);
  });

  it("ignores roles with no seniority", () => {
    expect(deriveSalaryBands([job({ seniority: null })])).toEqual([]);
  });

  it("orders the bands as a ladder, not by how many roles each has", () => {
    const bands = deriveSalaryBands([
      job({ id: "a", seniority: "LEAD" }),
      job({ id: "b", seniority: "ENTRY" }),
      job({ id: "c", seniority: "SENIOR" }),
      job({ id: "d", seniority: "MID" }),
    ]);

    expect(bands.map((band) => band.seniority)).toEqual(["Entry", "Mid", "Senior", "Lead"]);
  });

  it("handles a one-sided range without inventing a zero", () => {
    const bands = deriveSalaryBands([
      job({ seniority: "MID", salaryMin: 2_000_000, salaryMax: null }),
    ]);

    expect(bands[0]?.minSalary).toBe(2_000_000);
    expect(bands[0]?.maxSalary).toBe(2_000_000);
    expect(bands[0]?.medianSalary).toBe(2_000_000);
  });
});

describe("freshSince", () => {
  it("looks back exactly one week", () => {
    expect(freshSince(NOW).toISOString()).toBe(daysAgo(7));
  });
});
