import {
  AuthUserData,
  EmptyData,
  ErrorResponse,
  LoginBody,
  RegisterBody,
  SuccessResponse,
} from "@chowk/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { hashPassword, verifyPassword } from "../modules/auth/password";
import { ErrorCodes, sendError, sendResponse } from "../utils/send-response";
import { toUserDto } from "../utils/serializers";

/* Auth endpoints are the most attacked, so they get the tightest rate limit. */
const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "/register",
    {
      config: authRateLimit,
      schema: {
        body: RegisterBody,
        response: { 201: SuccessResponse(AuthUserData), 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();

      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return sendError(reply, 409, ErrorCodes.EMAIL_TAKEN, "That email is already registered.");
      }

      const user = await app.prisma.user.create({
        data: {
          email,
          name: request.body.name.trim(),
          passwordHash: await hashPassword(request.body.password),
          authProvider: "PASSWORD",
        },
      });

      app.startSession(reply, user);
      return sendResponse(reply, 201, { user: toUserDto(user) });
    },
  );

  app.post(
    "/login",
    {
      config: authRateLimit,
      schema: {
        body: LoginBody,
        response: { 200: SuccessResponse(AuthUserData), 401: ErrorResponse },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      const user = await app.prisma.user.findFirst({ where: { email, deletedAt: null } });

      if (!user) {
        return sendError(
          reply,
          401,
          ErrorCodes.INVALID_CREDENTIALS,
          "That email and password do not match.",
        );
      }

      // A Google-only account has no password to check against.
      if (user.passwordHash === null) {
        return sendError(
          reply,
          400,
          ErrorCodes.USE_GOOGLE_LOGIN,
          "This account uses Google sign-in.",
        );
      }

      if (!(await verifyPassword(user.passwordHash, request.body.password))) {
        return sendError(
          reply,
          401,
          ErrorCodes.INVALID_CREDENTIALS,
          "That email and password do not match.",
        );
      }

      app.startSession(reply, user);
      return sendResponse(reply, 200, { user: toUserDto(user) });
    },
  );

  app.post(
    "/logout",
    {
      onRequest: [app.authenticate],
      schema: { response: { 200: SuccessResponse(EmptyData) } },
    },
    async (_request, reply) => {
      app.clearSession(reply);
      return sendResponse(reply, 200, {});
    },
  );

  app.get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: { response: { 200: SuccessResponse(AuthUserData), 401: ErrorResponse } },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findFirst({
        where: { id: request.user.sub, deletedAt: null },
      });

      if (!user) {
        // The token is valid but the account is gone; treat it as signed out.
        app.clearSession(reply);
        return sendError(reply, 401, ErrorCodes.UNAUTHORIZED, "Sign in to continue.");
      }

      return sendResponse(reply, 200, { user: toUserDto(user) });
    },
  );

  /*
    Google sign-in is phase 3b in the PRD. It needs an OAuth client this repo
    cannot ship, so until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set and
    that phase is built, both routes say so plainly rather than 404.
  */
  for (const route of ["/google", "/google/callback"] as const) {
    app.get(route, { config: authRateLimit }, async (_request, reply) =>
      sendError(
        reply,
        503,
        ErrorCodes.NOT_CONFIGURED,
        "Google sign-in is not configured on this server. Use email and password.",
      ),
    );
  }
};

export default authRoutes;
