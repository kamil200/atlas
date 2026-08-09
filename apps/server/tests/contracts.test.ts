import {
  ApplicationStatus,
  AuthProvider,
  FilterParams,
  FundingStage,
  HiringStatus,
  JobStatus,
  MapSearchParams,
  SubmissionStatus,
  UserRole,
  WorkMode,
} from "@chowk/schema";
import { Prisma } from "@chowk/database";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Value } from "@sinclair/typebox/value";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { toCompanyDetail } from "../src/utils/serializers";

type DbEnum = { name: string; values: { name: string }[] };

/*
  Builds the smallest server that still parses a query string the way the real
  one does. The ajv options here must match app.ts, which is the whole point.
*/
async function buildQueryApp() {
  const app = Fastify({
    ajv: { customOptions: { coerceTypes: "array" } },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.get("/filters", { schema: { querystring: FilterParams } }, async (request) => request.query);
  await app.ready();
  return app;
}

describe("query string parsing", () => {
  it("turns a single repeated param into an array", async () => {
    const app = await buildQueryApp();
    const response = await app.inject({ method: "GET", url: "/filters?workMode=REMOTE" });

    expect(response.statusCode).toBe(200);
    expect(response.json().workMode).toEqual(["REMOTE"]);
    await app.close();
  });

  it("keeps every value when a param repeats", async () => {
    const app = await buildQueryApp();
    const response = await app.inject({
      method: "GET",
      url: "/filters?workMode=REMOTE&workMode=HYBRID&city=Pune",
    });

    expect(response.json().workMode).toEqual(["REMOTE", "HYBRID"]);
    expect(response.json().city).toEqual(["Pune"]);
    await app.close();
  });

  it("rejects a value outside the enum", async () => {
    const app = await buildQueryApp();
    const response = await app.inject({ method: "GET", url: "/filters?workMode=TELEPORT" });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("accepts an empty query string", async () => {
    const app = await buildQueryApp();
    const response = await app.inject({ method: "GET", url: "/filters" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({});
    await app.close();
  });
});

describe("MapSearchParams", () => {
  it("accepts the sidebar keys that never reach the API", () => {
    expect(
      Value.Check(MapSearchParams, { companySlug: "razorpay", jobId: "job_1", workMode: ["REMOTE"] }),
    ).toBe(true);
  });

  it("still rejects a bad enum value", () => {
    expect(Value.Check(MapSearchParams, { workMode: ["TELEPORT"] })).toBe(false);
  });
});

/*
  The enums are declared twice on purpose — once in Prisma, once in
  @chowk/schema so the browser never imports the Prisma client. This test is
  what makes that safe.
*/
describe("enum parity between Prisma and @chowk/schema", () => {
  /*
    The expected values are read out of the generated Prisma client, so adding
    a value in a migration and forgetting the schema package fails here rather
    than at runtime in a route nobody exercised yet.
  */
  function fromPrisma(name: string): string[] {
    const { dmmf } = Prisma as unknown as { dmmf: { datamodel: { enums: DbEnum[] } } };
    const found = dmmf.datamodel.enums.find((entry) => entry.name === name);
    if (!found) throw new Error(`Prisma has no enum called ${name}`);
    return found.values.map((value) => value.name).sort();
  }

  const cases: [string, Record<string, string>][] = [
    ["UserRole", UserRole],
    ["AuthProvider", AuthProvider],
    ["WorkMode", WorkMode],
    ["HiringStatus", HiringStatus],
    ["FundingStage", FundingStage],
    ["SubmissionStatus", SubmissionStatus],
    ["ApplicationStatus", ApplicationStatus],
    ["JobStatus", JobStatus],
  ];

  it.each(cases)("%s matches the database", (name, schemaEnum) => {
    expect(Object.values(schemaEnum).sort()).toEqual(fromPrisma(name));
  });

  it("keeps the key and the value identical, which the DTOs rely on", () => {
    for (const [, schemaEnum] of cases) {
      for (const [key, value] of Object.entries(schemaEnum)) expect(key).toBe(value);
    }
  });
});

describe("BigInt serialisation", () => {
  it("survives JSON.stringify with nine-figure funding", () => {
    const company = {
      id: "co_0001",
      slug: "razorpay",
      name: "Razorpay",
      logoUrl: null,
      tagline: null,
      description: "",
      website: null,
      industries: [],
      foundedYear: 2014,
      employeeCount: 3000,
      hiringStatus: "ACTIVELY_HIRING" as const,
      fundingStage: "SERIES_D_PLUS" as const,
      // These are the values that make JSON.stringify throw if left as BigInt.
      totalFundingUsd: 741_000_000n,
      valuationUsd: 7_500_000_000n,
      submissionStatus: "APPROVED" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      offices: [],
      founders: [],
      investors: [],
    };

    const dto = toCompanyDetail(company, [], new Map());

    expect(typeof dto.totalFundingUsd).toBe("number");
    expect(dto.totalFundingUsd).toBe(741_000_000);
    expect(dto.valuationUsd).toBe(7_500_000_000);
    expect(() => JSON.stringify(dto)).not.toThrow();
  });

  it("keeps a null amount null rather than turning it into zero", () => {
    const bootstrapped = {
      id: "co_0002",
      slug: "zerodha",
      name: "Zerodha",
      logoUrl: null,
      tagline: null,
      description: "",
      website: null,
      industries: [],
      foundedYear: 2010,
      employeeCount: 1200,
      hiringStatus: "ACTIVELY_HIRING" as const,
      fundingStage: "BOOTSTRAPPED" as const,
      totalFundingUsd: null,
      valuationUsd: null,
      submissionStatus: "APPROVED" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      offices: [],
      founders: [],
      investors: [],
    };

    const dto = toCompanyDetail(bootstrapped, [], new Map());
    expect(dto.totalFundingUsd).toBeNull();
  });
});
