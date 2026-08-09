import type { Prisma } from "@chowk/database";
import {
  ErrorResponse,
  JobData,
  JobQuery,
  JobsListData,
  JobsQuery,
  SuccessResponse,
} from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { compileJobWhere } from "../modules/filters/compile-filters";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import { jobInclude, toJobDetail, toJobSummary } from "../utils/serializers";

const jobRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/jobs",
    { schema: { querystring: JobsQuery, response: { 200: SuccessResponse(JobsListData) } } },
    async (request, reply) => {
      const { page = 1, pageSize = 20, sort = "recent", ...filters } = request.query;
      const where = compileJobWhere(filters);

      // Jobs with no advertised salary sort last rather than first.
      const orderBy: Prisma.JobOrderByWithRelationInput =
        sort === "salary" ? { salaryMax: { sort: "desc", nulls: "last" } } : { postedAt: "desc" };

      const [total, rows] = await Promise.all([
        app.prisma.job.count({ where }),
        app.prisma.job.findMany({
          where,
          include: jobInclude,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return sendResponse(reply, 200, {
        items: rows.map(toJobSummary),
        total,
        page,
        pageSize,
      });
    },
  );

  app.get(
    "/job",
    {
      schema: {
        querystring: JobQuery,
        response: { 200: SuccessResponse(JobData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const job = await app.prisma.job.findFirst({
        where: {
          id: request.query.id,
          deletedAt: null,
          company: { submissionStatus: "APPROVED", deletedAt: null },
        },
        include: jobInclude,
      });

      if (!job) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that role.");
      }

      // A closed job is still readable by direct link — the status field says so.
      return sendResponse(reply, 200, { job: toJobDetail(job) });
    },
  );
};

export default jobRoutes;
