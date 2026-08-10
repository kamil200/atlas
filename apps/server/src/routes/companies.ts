import {
  CompaniesListData,
  CompaniesMapData,
  CompaniesQuery,
  CompanyData,
  CompanyQuery,
  ErrorResponse,
  SuccessResponse,
} from "@atlas/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  deriveSalaryBands,
  deriveStats,
  freshSince,
  HOT_JOB_COUNT,
} from "../modules/companies/derive-stats";
import {
  compileCompanyWhere,
  compileJobWhere,
  compileOfficeWhere,
  VISIBLE_COMPANY,
  VISIBLE_JOB,
} from "../modules/filters/compile-filters";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import {
  companyDetailInclude,
  companySummaryInclude,
  jobInclude,
  toCompanyDetail,
  toCompanySummary,
  toJobSummary,
} from "../utils/serializers";

const companyRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/companies",
    {
      schema: {
        querystring: CompaniesQuery,
        response: { 200: SuccessResponse(CompaniesListData) },
      },
    },
    async (request, reply) => {
      const { page = 1, pageSize = 20, ...filters } = request.query;
      const where = compileCompanyWhere(filters);

      const [total, rows] = await Promise.all([
        app.prisma.company.count({ where }),
        app.prisma.company.findMany({
          where,
          include: companySummaryInclude,
          // Alphabetical is the one order that stays stable as filters change.
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const openCounts = await countOpenJobsByCompany(
        app,
        filters,
        rows.map((row) => row.id),
      );

      return sendResponse(reply, 200, {
        items: rows.map((row) => toCompanySummary(row, openCounts.get(row.id) ?? 0)),
        total,
        page,
        pageSize,
      });
    },
  );

  app.get(
    "/company",
    {
      schema: {
        querystring: CompanyQuery,
        response: { 200: SuccessResponse(CompanyData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const company = await app.prisma.company.findFirst({
        where: { slug: request.query.slug, ...VISIBLE_COMPANY },
        include: companyDetailInclude,
      });

      if (!company) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that company.");
      }

      // The profile always lists every open role, whatever the map filters say.
      const jobs = await app.prisma.job.findMany({
        where: { companyId: company.id, ...VISIBLE_JOB },
        include: jobInclude,
        orderBy: [{ postedAt: "desc" }, { id: "asc" }],
      });

      const officeJobCounts = new Map<string, number>();
      for (const job of jobs) {
        if (job.officeId) {
          officeJobCounts.set(job.officeId, (officeJobCounts.get(job.officeId) ?? 0) + 1);
        }
      }

      /*
        Stats and salary bands are derived from the same list of roles the page
        renders below them, so the headline numbers can never contradict the
        jobs a visitor can count for themselves.
      */
      const summaries = jobs.map(toJobSummary);
      const now = new Date();

      return sendResponse(reply, 200, {
        company: toCompanyDetail(company, summaries, officeJobCounts, {
          stats: deriveStats(summaries, now),
          salaryBands: deriveSalaryBands(summaries),
        }),
      });
    },
  );

  /*
    No bbox and no server-side clustering. The whole filtered set is a few
    hundred thin rows, so it ships once and MapLibre clusters it in a worker —
    panning and zooming then cost nothing at all.
  */
  app.get(
    "/companies/map",
    {
      schema: { querystring: CompaniesQuery, response: { 200: SuccessResponse(CompaniesMapData) } },
    },
    async (request, reply) => {
      const { page: _page, pageSize: _pageSize, ...filters } = request.query;

      const jobWhere = compileJobWhere(filters);
      const [offices, pinnedCounts, remoteCounts, freshPinned, freshRemote] = await Promise.all([
        app.prisma.office.findMany({
          where: compileOfficeWhere(filters),
          include: {
            company: {
              select: { id: true, slug: true, name: true, logoUrl: true, hiringStatus: true },
            },
          },
        }),
        app.prisma.job.groupBy({
          by: ["officeId"],
          where: { ...jobWhere, officeId: { not: null } },
          _count: { _all: true },
        }),
        // Remote roles are pinned nowhere, so they surface on the company's HQ.
        app.prisma.job.groupBy({
          by: ["companyId"],
          where: { ...jobWhere, officeId: null },
          _count: { _all: true },
        }),
        /*
          Which offices have something posted this week, and which companies
          posted a fresh remote role. Two queries for the same reason the counts
          above are two: a remote role belongs to the company, not to an office,
          and lumping them together would mark every head office as new the
          moment any one company posted remotely.
        */
        app.prisma.job.groupBy({
          by: ["officeId"],
          where: { ...jobWhere, officeId: { not: null }, postedAt: { gte: freshSince() } },
          _count: { _all: true },
        }),
        app.prisma.job.groupBy({
          by: ["companyId"],
          where: { ...jobWhere, officeId: null, postedAt: { gte: freshSince() } },
          _count: { _all: true },
        }),
      ]);

      const pinnedByOffice = new Map(
        pinnedCounts.map((row) => [row.officeId ?? "", row._count._all]),
      );
      const remoteByCompany = new Map(remoteCounts.map((row) => [row.companyId, row._count._all]));
      const freshByOffice = new Map(
        freshPinned.map((row) => [row.officeId ?? "", row._count._all]),
      );
      const freshRemoteByCompany = new Map(
        freshRemote.map((row) => [row.companyId, row._count._all]),
      );

      const points = offices.map((office) => {
        const openJobCount =
          (pinnedByOffice.get(office.id) ?? 0) +
          (office.isHq ? (remoteByCompany.get(office.company.id) ?? 0) : 0);

        return {
          officeId: office.id,
          companyId: office.company.id,
          companySlug: office.company.slug,
          companyName: office.company.name,
          logoUrl: office.company.logoUrl,
          lat: office.lat,
          lng: office.lng,
          isHq: office.isHq,
          hiringStatus: office.company.hiringStatus,
          openJobCount,
          isHot: openJobCount >= HOT_JOB_COUNT,
          // Remote roles have no office, so their freshness lands on the HQ too.
          newJobCount:
            (freshByOffice.get(office.id) ?? 0) +
            (office.isHq ? (freshRemoteByCompany.get(office.company.id) ?? 0) : 0),
        };
      });

      /*
        Which offices earn a pin under a job-level filter is decided by
        compileOfficeWhere, not here. It used to be re-decided at this line, and
        the two rules drifted — the facet panel offered cities the map then drew
        no pin for.
      */
      return sendResponse(reply, 200, { offices: points });
    },
  );
};

/* Open roles per company under the active filters, for the list view. */
async function countOpenJobsByCompany(
  app: Parameters<FastifyPluginAsyncTypebox>[0],
  filters: Parameters<typeof compileJobWhere>[0],
  companyIds: string[],
) {
  if (companyIds.length === 0) return new Map<string, number>();

  const rows = await app.prisma.job.groupBy({
    by: ["companyId"],
    where: { ...compileJobWhere(filters), companyId: { in: companyIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.companyId, row._count._all]));
}

export default companyRoutes;
