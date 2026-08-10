import {
  AdminSubmissionsQuery,
  ErrorResponse,
  ReviewSubmissionBody,
  SubmissionData,
  SubmissionsListData,
  SuccessResponse,
} from "@atlas/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import { submissionInclude, toSubmissionDto } from "../utils/serializers";

const adminRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/submissions",
    {
      onRequest: [app.requireAdmin],
      schema: {
        querystring: AdminSubmissionsQuery,
        response: {
          200: SuccessResponse(SubmissionsListData),
          401: ErrorResponse,
          403: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const status = request.query.status;
      const items = await app.prisma.companySubmission.findMany({
        where: status ? { company: { submissionStatus: status } } : undefined,
        include: submissionInclude,
        orderBy: { createdAt: "asc" },
      });

      return sendResponse(reply, 200, { items: items.map(toSubmissionDto) });
    },
  );

  app.patch(
    "/submissions",
    {
      onRequest: [app.requireAdmin],
      schema: {
        body: ReviewSubmissionBody,
        response: { 200: SuccessResponse(SubmissionData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const submission = await app.prisma.companySubmission.findUnique({
        where: { id: request.body.id },
        select: { id: true, companyId: true },
      });

      if (!submission) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that submission.");
      }

      /*
        The company's status and the review note move together. Half of this
        applied would either hide an approved company or show a rejected one.
      */
      const [, reviewed] = await app.prisma.$transaction([
        app.prisma.company.update({
          where: { id: submission.companyId },
          data: { submissionStatus: request.body.status },
        }),
        app.prisma.companySubmission.update({
          where: { id: submission.id },
          data: {
            adminNote: request.body.note?.trim() || null,
            reviewedById: request.user.sub,
            reviewedAt: new Date(),
          },
          include: submissionInclude,
        }),
      ]);

      return sendResponse(reply, 200, { submission: toSubmissionDto(reviewed) });
    },
  );
};

export default adminRoutes;
