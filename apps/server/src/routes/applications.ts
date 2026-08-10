import {
  ApplicationData,
  ApplicationsListData,
  ApplicationsQuery,
  EmptyData,
  ErrorResponse,
  SaveJobBody,
  SimpleApplyBody,
  SuccessResponse,
  UnsaveJobQuery,
  UpdateApplicationBody,
} from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { VISIBLE_COMPANY, VISIBLE_JOB } from "../modules/filters/compile-filters";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import { jobInclude, toApplicationDto } from "../utils/serializers";

/* Mutations behind a login get a looser limit than the auth endpoints. */
const mutationRateLimit = { rateLimit: { max: 20, timeWindow: "1 minute" } };

const withJob = { job: { include: jobInclude } };

const applicationRoutes: FastifyPluginAsyncTypebox = async (app) => {
  /*
    A saved job and a submitted application are the same row at different
    stages, so the tracker reads from one place and applying to something you
    saved never moves a row between tables.

    These queries deliberately skip the public visibility filters: a role that
    closed after you applied still belongs in your own history.
  */
  app.get(
    "/applications",
    {
      onRequest: [app.authenticate],
      schema: {
        querystring: ApplicationsQuery,
        response: { 200: SuccessResponse(ApplicationsListData), 401: ErrorResponse },
      },
    },
    async (request, reply) => {
      const items = await app.prisma.application.findMany({
        where: { userId: request.user.sub, status: request.query.status },
        include: withJob,
        orderBy: { updatedAt: "desc" },
      });

      return sendResponse(reply, 200, { items: items.map(toApplicationDto) });
    },
  );

  app.put(
    "/applications",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        body: SaveJobBody,
        response: { 200: SuccessResponse(ApplicationData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      /*
        You can only save something you could have browsed to. Without the
        company clause, replaying an old job id returned the full role — title,
        salary, company — for a company that had since been hidden or removed.
      */
      const job = await app.prisma.job.findFirst({
        where: { id: request.body.jobId, ...VISIBLE_JOB, company: VISIBLE_COMPANY },
        select: { id: true },
      });
      if (!job) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that role.");
      }

      /*
        Saving twice must not undo an application, so the update branch is
        empty on purpose — the unique (userId, jobId) index makes this safe to
        call as often as the bookmark button is clicked.
      */
      const application = await app.prisma.application.upsert({
        where: { userId_jobId: { userId: request.user.sub, jobId: job.id } },
        create: { userId: request.user.sub, jobId: job.id, status: "SAVED" },
        update: {},
        include: withJob,
      });

      return sendResponse(reply, 200, { application: toApplicationDto(application) });
    },
  );

  app.delete(
    "/applications",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        querystring: UnsaveJobQuery,
        response: { 200: SuccessResponse(EmptyData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      // Unsaving is a real delete; there is nothing here worth auditing.
      const result = await app.prisma.application.deleteMany({
        where: { userId: request.user.sub, jobId: request.query.jobId },
      });

      if (result.count === 0) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "That job was not on your list.");
      }

      return sendResponse(reply, 200, {});
    },
  );

  app.patch(
    "/applications",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        body: UpdateApplicationBody,
        response: { 200: SuccessResponse(ApplicationData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const existing = await app.prisma.application.findUnique({
        where: { userId_jobId: { userId: request.user.sub, jobId: request.body.jobId } },
      });

      if (!existing) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "That job was not on your list.");
      }

      // appliedAt records the first time you applied and never moves after that.
      const becomesApplied = request.body.status === "APPLIED" && existing.appliedAt === null;

      const application = await app.prisma.application.update({
        where: { id: existing.id },
        data: {
          status: request.body.status,
          ...(becomesApplied ? { appliedAt: new Date(), applyMethod: "EXTERNAL" } : {}),
        },
        include: withJob,
      });

      return sendResponse(reply, 200, { application: toApplicationDto(application) });
    },
  );

  app.post(
    "/jobs/simple-apply",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        body: SimpleApplyBody,
        response: {
          200: SuccessResponse(ApplicationData),
          404: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const [job, resume] = await Promise.all([
        app.prisma.job.findFirst({
          where: { id: request.body.jobId, deletedAt: null, company: VISIBLE_COMPANY },
          select: { id: true, status: true },
        }),
        app.prisma.resume.findFirst({
          where: { id: request.body.resumeId, userId: request.user.sub, deletedAt: null },
          select: { id: true },
        }),
      ]);

      if (!job) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that role.");
      }
      if (job.status === "CLOSED") {
        return sendError(reply, 409, ErrorCodes.CONFLICT, "This role is no longer open.");
      }
      if (!resume) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that resume.");
      }

      const existing = await app.prisma.application.findUnique({
        where: { userId_jobId: { userId: request.user.sub, jobId: job.id } },
        select: { id: true, appliedAt: true },
      });

      const applied = {
        status: "APPLIED",
        applyMethod: "SIMPLE_APPLY",
        resumeId: resume.id,
        coverNote: request.body.coverNote ?? null,
        appliedAt: existing?.appliedAt ?? new Date(),
      } as const;

      const application = await app.prisma.application.upsert({
        where: { userId_jobId: { userId: request.user.sub, jobId: job.id } },
        create: { userId: request.user.sub, jobId: job.id, ...applied },
        update: applied,
        include: withJob,
      });

      return sendResponse(reply, 200, { application: toApplicationDto(application) });
    },
  );
};

export default applicationRoutes;
