import { describe, expect, it } from "vitest";
import { buildDataset } from "../prisma/seed/build-dataset";
import { createRng } from "../prisma/seed/rng";

/*
  The generator is pure, so this proves determinism without touching Postgres.
  A seed that shifts between runs makes every screenshot, every bug report,
  and every demo slightly different from the last one.
*/

const NOW = Date.UTC(2026, 0, 1);

describe("seed determinism", () => {
  it("produces identical data from the same seed", () => {
    const first = buildDataset(createRng(), NOW);
    const second = buildDataset(createRng(), NOW);

    // BigInt does not survive JSON.stringify, so compare the objects directly.
    expect(second).toEqual(first);
  });

  it("produces different data from a different seed", () => {
    const first = buildDataset(createRng(), NOW);
    const other = buildDataset(createRng(12345), NOW);

    expect(other.companies).not.toEqual(first.companies);
    // The anchor companies are fixed, so the count stays put either way.
    expect(other.companies).toHaveLength(first.companies.length);
  });

  it("hits the shape the rest of the app assumes", () => {
    const data = buildDataset(createRng(), NOW);

    expect(data.companies).toHaveLength(90);
    expect(data.departments).toHaveLength(15);
    expect(data.investors).toHaveLength(40);
    expect(data.jobs.length).toBeGreaterThan(1300);
    expect(data.jobs.length).toBeLessThan(1800);
    expect(data.users).toHaveLength(2);
  });

  it("never leaves a quiet company advertising an open role", () => {
    const data = buildDataset(createRng(), NOW);
    const quiet = new Set(
      data.companies.filter((company) => company.hiringStatus === "NOT_HIRING").map((c) => c.id),
    );

    const contradictions = data.jobs.filter(
      (job) => job.status === "OPEN" && quiet.has(job.companyId as string),
    );
    expect(contradictions).toHaveLength(0);
  });

  it("pins every job to an office unless it is remote", () => {
    const data = buildDataset(createRng(), NOW);

    for (const job of data.jobs) {
      if (job.workMode === "REMOTE") expect(job.officeId).toBeNull();
      else expect(job.officeId).not.toBeNull();
    }
  });

  it("gives bootstrapped companies no investors", () => {
    const data = buildDataset(createRng(), NOW);
    const bootstrapped = new Set(
      data.companies.filter((company) => company.fundingStage === "BOOTSTRAPPED").map((c) => c.id),
    );

    expect(bootstrapped.size).toBeGreaterThan(0);
    for (const link of data.companyInvestors) {
      expect(bootstrapped.has(link.companyId as string)).toBe(false);
    }
  });
});
