import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  EmptyData,
  ErrorResponse,
  RESUME_EXTENSIONS,
  RESUME_MAX_BYTES,
  RESUME_MIME_TYPES,
  ResumeData,
  ResumeIdQuery,
  ResumesListData,
  SetDefaultResumeBody,
  SuccessResponse,
} from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import { toResumeDto } from "../utils/serializers";

const mutationRateLimit = { rateLimit: { max: 20, timeWindow: "1 minute" } };

/* Keeps the original name readable while making it safe to put on disk. */
function sanitizeFilename(filename: string): string {
  return path
    .basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-80);
}

const resumeRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/resumes",
    {
      onRequest: [app.authenticate],
      schema: { response: { 200: SuccessResponse(ResumesListData), 401: ErrorResponse } },
    },
    async (request, reply) => {
      const items = await app.prisma.resume.findMany({
        where: { userId: request.user.sub, deletedAt: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
      return sendResponse(reply, 200, { items: items.map(toResumeDto) });
    },
  );

  app.post(
    "/resumes",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        response: {
          201: SuccessResponse(ResumeData),
          400: ErrorResponse,
          413: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return sendError(reply, 400, ErrorCodes.NO_FILE, "Attach a file to upload.");
      }

      // Check the declared type and the extension: either alone is easy to fake.
      const extension = path.extname(file.filename).toLowerCase();
      const mimeOk = (RESUME_MIME_TYPES as readonly string[]).includes(file.mimetype);
      const extensionOk = (RESUME_EXTENSIONS as readonly string[]).includes(extension);
      if (!mimeOk || !extensionOk) {
        return sendError(
          reply,
          400,
          ErrorCodes.UNSUPPORTED_FILE_TYPE,
          "Upload a PDF, DOC, or DOCX file.",
        );
      }

      const buffer = await file.toBuffer();

      // Multipart enforces the cap while streaming; this catches the truncated case.
      if (file.file.truncated || buffer.byteLength > RESUME_MAX_BYTES) {
        return sendError(reply, 413, ErrorCodes.FILE_TOO_LARGE, "That file is larger than 5MB.");
      }

      const filename = sanitizeFilename(file.filename);
      const storageKey = `resumes/${request.user.sub}/${randomUUID()}-${filename}`;
      await app.storage.put(storageKey, buffer);

      try {
        const existingCount = await app.prisma.resume.count({
          where: { userId: request.user.sub, deletedAt: null },
        });

        const resume = await app.prisma.resume.create({
          data: {
            userId: request.user.sub,
            filename,
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: buffer.byteLength,
            // The first resume someone uploads becomes their default.
            isDefault: existingCount === 0,
          },
        });

        return sendResponse(reply, 201, { resume: toResumeDto(resume) });
      } catch (error) {
        // Don't leave an orphan file behind if the row could not be written.
        await app.storage.delete(storageKey);
        throw error;
      }
    },
  );

  app.delete(
    "/resumes",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        querystring: ResumeIdQuery,
        response: { 200: SuccessResponse(EmptyData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const resume = await app.prisma.resume.findFirst({
        where: { id: request.query.id, userId: request.user.sub, deletedAt: null },
      });
      if (!resume) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that resume.");
      }

      /*
        Soft delete, and the file stays put. Applications you already sent
        still point at the resume you sent them with.
      */
      await app.prisma.resume.update({
        where: { id: resume.id },
        data: { deletedAt: new Date(), isDefault: false },
      });

      // Promote the next resume so the user is never left without a default.
      if (resume.isDefault) {
        const next = await app.prisma.resume.findFirst({
          where: { userId: request.user.sub, deletedAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (next) {
          await app.prisma.resume.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }

      return sendResponse(reply, 200, {});
    },
  );

  app.patch(
    "/resumes",
    {
      onRequest: [app.authenticate],
      config: mutationRateLimit,
      schema: {
        body: SetDefaultResumeBody,
        response: { 200: SuccessResponse(ResumeData), 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const resume = await app.prisma.resume.findFirst({
        where: { id: request.body.id, userId: request.user.sub, deletedAt: null },
      });
      if (!resume) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that resume.");
      }

      // One transaction, so there is never a moment with two defaults or none.
      const [, updated] = await app.prisma.$transaction([
        app.prisma.resume.updateMany({
          where: { userId: request.user.sub, isDefault: true },
          data: { isDefault: false },
        }),
        app.prisma.resume.update({ where: { id: resume.id }, data: { isDefault: true } }),
      ]);

      return sendResponse(reply, 200, { resume: toResumeDto(updated) });
    },
  );

  app.get(
    "/resumes/download",
    {
      onRequest: [app.authenticate],
      // No response schema: this route answers with a file stream, not JSON.
      schema: { querystring: ResumeIdQuery },
    },
    async (request, reply) => {
      const resume = await app.prisma.resume.findFirst({
        where: { id: request.query.id, userId: request.user.sub },
      });
      if (!resume) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "We could not find that resume.");
      }

      if (!(await app.storage.exists(resume.storageKey))) {
        return sendError(reply, 404, ErrorCodes.NOT_FOUND, "That file is no longer available.");
      }

      // Streaming through the API keeps storage keys off the public internet.
      reply.header("Content-Type", resume.mimeType);
      reply.header("Content-Disposition", `attachment; filename="${resume.filename}"`);
      return reply.send(await app.storage.get(resume.storageKey));
    },
  );
};

export default resumeRoutes;
