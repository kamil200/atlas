import "./load-env";

import { RESUME_MAX_BYTES } from "@atlas/schema";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import authPlugin from "./plugins/auth";
import envPlugin from "./plugins/env";
import prismaPlugin from "./plugins/prisma";
import storagePlugin from "./plugins/storage";
import adminRoutes from "./routes/admin";
import applicationRoutes from "./routes/applications";
import authRoutes from "./routes/auth";
import companyRoutes from "./routes/companies";
import facetRoutes from "./routes/facets";
import jobRoutes from "./routes/jobs";
import referenceRoutes from "./routes/reference";
import resumeRoutes from "./routes/resumes";
import searchRoutes from "./routes/search";
import submissionRoutes from "./routes/submissions";
import { ErrorCodes, sendError } from "./utils/send-response";

export type AppServer = Awaited<ReturnType<typeof buildApp>>;

/*
  Builds the server without listening, so tests can drive it through
  app.inject() and never bind a port.
*/
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            }
          : undefined,
    },
    ajv: {
      customOptions: {
        // A single repeated query param (?workMode=REMOTE) has to parse as an array.
        coerceTypes: "array",
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(envPlugin);
  await app.register(fastifySensible);
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });

  /*
    Rate limiting off under test: the suite fires hundreds of requests a second
    and would spend its time proving the limiter works rather than the routes.
  */
  if (app.config.NODE_ENV !== "test") {
    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });
  }

  await app.register(fastifyMultipart, {
    limits: { fileSize: RESUME_MAX_BYTES, files: 1 },
  });

  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(storagePlugin);

  registerErrorHandlers(app);

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(companyRoutes, { prefix: "/api" });
  await app.register(jobRoutes, { prefix: "/api" });
  await app.register(facetRoutes, { prefix: "/api" });
  await app.register(searchRoutes, { prefix: "/api" });
  await app.register(referenceRoutes, { prefix: "/api" });
  await app.register(applicationRoutes, { prefix: "/api" });
  await app.register(resumeRoutes, { prefix: "/api" });
  await app.register(submissionRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api/admin" });

  return app;
}

/* Turns anything thrown anywhere into the same error envelope. */
function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, ErrorCodes.NOT_FOUND, `No route for ${request.method} ${request.url}.`),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return sendError(reply, 400, ErrorCodes.VALIDATION_ERROR, error.message);
    }
    if (error.statusCode === 429) {
      return sendError(
        reply,
        429,
        ErrorCodes.RATE_LIMITED,
        "Too many requests. Try again shortly.",
      );
    }
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      return sendError(reply, 413, ErrorCodes.FILE_TOO_LARGE, "That file is larger than 5MB.");
    }
    if (error.statusCode && error.statusCode < 500) {
      return sendError(reply, error.statusCode, ErrorCodes.VALIDATION_ERROR, error.message);
    }

    // Anything unrecognised is a bug: log it in full, tell the client nothing.
    request.log.error({ err: error }, "Unhandled error");
    return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, "Something went wrong on our side.");
  });
}
