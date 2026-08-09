import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { ErrorCodes, sendError } from "../utils/send-response";

export const SESSION_COOKIE = "chowk_session";
const SESSION_DAYS = 7;

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: "USER" | "ADMIN" };
    user: { sub: string; role: "USER" | "ADMIN" };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Rejects with 401 unless the request carries a valid session cookie. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Same as authenticate, plus the user must be an admin. */
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Signs a session token and puts it in the httpOnly cookie. */
    startSession: (reply: FastifyReply, user: { id: string; role: "USER" | "ADMIN" }) => void;
    clearSession: (reply: FastifyReply) => void;
  }
}

export default fp(async (app: FastifyInstance) => {
  // Cookie has to be registered first: @fastify/jwt reads the token out of it.
  await app.register(fastifyCookie, { secret: app.config.COOKIE_SECRET });

  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: `${SESSION_DAYS}d` },
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return sendError(reply, 401, ErrorCodes.UNAUTHORIZED, "Sign in to continue.");
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return sendError(reply, 401, ErrorCodes.UNAUTHORIZED, "Sign in to continue.");
    }
    if (request.user.role !== "ADMIN") {
      return sendError(reply, 403, ErrorCodes.FORBIDDEN, "You do not have access to this.");
    }
  });

  app.decorate(
    "startSession",
    (reply: FastifyReply, user: { id: string; role: "USER" | "ADMIN" }) => {
      const token = app.jwt.sign({ sub: user.id, role: user.role });
      reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: app.config.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_DAYS * 24 * 60 * 60,
      });
    },
  );

  app.decorate("clearSession", (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
  });
});
