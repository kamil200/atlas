import { SEARCH_GROUP_LIMIT, SearchQuery, SearchResponse, SuccessResponse } from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { escapeLike, VISIBLE_COMPANY, VISIBLE_JOB } from "../modules/filters/compile-filters";
import { sendResponse } from "../utils/send-response";

/*
  Powers the command palette. Three plain "contains" queries in parallel —
  Postgres trigram indexes are on the v2 list, and at this data size a
  sequential scan answers in single-digit milliseconds.
*/
const searchRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/search",
    { schema: { querystring: SearchQuery, response: { 200: SuccessResponse(SearchResponse) } } },
    async (request, reply) => {
      // Escaped, or a query of "%" would quietly return the whole database.
      const q = escapeLike(request.query.q.trim());

      const [companies, jobs, locations] = await Promise.all([
        app.prisma.company.findMany({
          where: { ...VISIBLE_COMPANY, name: { contains: q, mode: "insensitive" } },
          select: { slug: true, name: true, logoUrl: true },
          orderBy: { name: "asc" },
          take: SEARCH_GROUP_LIMIT,
        }),
        app.prisma.job.findMany({
          where: {
            ...VISIBLE_JOB,
            title: { contains: q, mode: "insensitive" },
            company: VISIBLE_COMPANY,
          },
          select: { id: true, title: true, company: { select: { slug: true, name: true } } },
          orderBy: { postedAt: "desc" },
          take: SEARCH_GROUP_LIMIT,
        }),
        app.prisma.office.groupBy({
          by: ["city", "country"],
          where: {
            deletedAt: null,
            city: { contains: q, mode: "insensitive" },
            company: VISIBLE_COMPANY,
          },
          _count: { _all: true },
          orderBy: { _count: { city: "desc" } },
          take: SEARCH_GROUP_LIMIT,
        }),
      ]);

      return sendResponse(reply, 200, {
        companies,
        jobs: jobs.map((job) => ({
          id: job.id,
          title: job.title,
          companySlug: job.company.slug,
          companyName: job.company.name,
        })),
        locations: locations.map((row) => ({
          city: row.city,
          country: row.country,
          companyCount: row._count._all,
        })),
      });
    },
  );
};

export default searchRoutes;
