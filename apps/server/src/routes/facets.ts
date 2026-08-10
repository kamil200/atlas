import {
  type FacetBucket,
  FacetsResponse,
  FilterParams,
  FUNDING_STAGE_LABELS,
  HIRING_STATUS_LABELS,
  SuccessResponse,
  WORK_MODE_LABELS,
} from "@atlas/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  compileCompanyWhere,
  compileJobWhere,
  compileOfficeWhere,
} from "../modules/filters/compile-filters";
import { sendResponse } from "../utils/send-response";

/* Investors are a long tail; the panel shows the ones that actually matter. */
const INVESTOR_FACET_LIMIT = 150;

const facetRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/facets",
    { schema: { querystring: FilterParams, response: { 200: SuccessResponse(FacetsResponse) } } },
    async (request, reply) => {
      const filters = request.query;

      /*
        Each dimension is counted with its own filter omitted. Without that,
        ticking "Remote" would drop every other work mode to zero and you could
        never widen the selection again.

        All seven run together — done in sequence this would be seven round
        trips for something that has to feel instant.
      */
      const [hiringStatus, workMode, country, city, department, fundingStage, investors] =
        await Promise.all([
          countCompanies(app, filters, "hiringStatus"),
          countJobs(app, filters, "workMode"),
          countOffices(app, filters, "country"),
          countOffices(app, filters, "city"),
          countDepartments(app, filters),
          countCompanies(app, filters, "fundingStage"),
          countInvestors(app, filters),
        ]);

      return sendResponse(reply, 200, {
        hiringStatus,
        workMode,
        country,
        city,
        department,
        fundingStage,
        investors,
      });
    },
  );
};

type App = Parameters<FastifyPluginAsyncTypebox>[0];

function sortBuckets(buckets: FacetBucket[]): FacetBucket[] {
  return buckets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function countCompanies(
  app: App,
  filters: FilterParams,
  dimension: "hiringStatus" | "fundingStage",
): Promise<FacetBucket[]> {
  const rows = await app.prisma.company.groupBy({
    by: [dimension],
    where: compileCompanyWhere(filters, { omit: dimension }),
    _count: { _all: true },
  });

  const labels = dimension === "hiringStatus" ? HIRING_STATUS_LABELS : FUNDING_STAGE_LABELS;

  return sortBuckets(
    rows
      // fundingStage is nullable, and "unknown stage" is not a filterable value.
      .filter(
        (row): row is typeof row & { [K in typeof dimension]: string } => row[dimension] !== null,
      )
      .map((row) => {
        const value = row[dimension] as keyof typeof labels;
        return { value, label: labels[value] ?? value, count: row._count._all };
      }),
  );
}

async function countJobs(
  app: App,
  filters: FilterParams,
  dimension: "workMode",
): Promise<FacetBucket[]> {
  const rows = await app.prisma.job.groupBy({
    by: [dimension],
    where: compileJobWhere(filters, { omit: dimension }),
    _count: { _all: true },
  });

  return sortBuckets(
    rows.map((row) => ({
      value: row.workMode,
      label: WORK_MODE_LABELS[row.workMode],
      count: row._count._all,
    })),
  );
}

async function countOffices(
  app: App,
  filters: FilterParams,
  dimension: "country" | "city",
): Promise<FacetBucket[]> {
  const rows = await app.prisma.office.groupBy({
    by: [dimension],
    where: compileOfficeWhere(filters, { omit: dimension }),
    _count: { _all: true },
  });

  return sortBuckets(
    rows.map((row) => ({
      value: row[dimension],
      label: row[dimension],
      count: row._count._all,
    })),
  );
}

async function countDepartments(app: App, filters: FilterParams): Promise<FacetBucket[]> {
  const [rows, departments] = await Promise.all([
    app.prisma.job.groupBy({
      by: ["departmentId"],
      where: compileJobWhere(filters, { omit: "department" }),
      _count: { _all: true },
    }),
    app.prisma.department.findMany(),
  ]);

  // Filters send department slugs, so buckets are keyed by slug, not by id.
  const bySlug = new Map(departments.map((d) => [d.id, d]));

  return sortBuckets(
    rows.flatMap((row) => {
      const department = bySlug.get(row.departmentId);
      if (!department) return [];
      return [{ value: department.slug, label: department.name, count: row._count._all }];
    }),
  );
}

async function countInvestors(app: App, filters: FilterParams): Promise<FacetBucket[]> {
  const rows = await app.prisma.companyInvestor.groupBy({
    by: ["investorId"],
    where: { company: compileCompanyWhere(filters, { omit: "investors" }) },
    _count: { _all: true },
    orderBy: { _count: { investorId: "desc" } },
    take: INVESTOR_FACET_LIMIT,
  });

  const investors = await app.prisma.investor.findMany({
    where: { id: { in: rows.map((row) => row.investorId) } },
  });
  const byId = new Map(investors.map((investor) => [investor.id, investor]));

  return sortBuckets(
    rows.flatMap((row) => {
      const investor = byId.get(row.investorId);
      if (!investor) return [];
      return [{ value: investor.id, label: investor.name, count: row._count._all }];
    }),
  );
}

export default facetRoutes;
