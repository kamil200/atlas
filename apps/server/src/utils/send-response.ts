import type { FastifyReply } from "fastify";

/*
  Every response goes through one of these two. A client can then check one
  field — `success` — and never has to guess whether a 200 body is the payload
  or an error shape.
*/

export function sendResponse<T>(reply: FastifyReply, status: number, data: T) {
  return reply.status(status).send({ success: true, data });
}

export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ success: false, error: { code, message } });
}

/* Error codes used in more than one place. Codes are SCREAMING_SNAKE. */
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USE_GOOGLE_LOGIN: "USE_GOOGLE_LOGIN",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE",
  NO_FILE: "NO_FILE",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
