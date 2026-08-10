import { randomBytes } from "node:crypto";
import {
  AuthProvidersData,
  AuthUserData,
  EmptyData,
  ErrorResponse,
  LoginBody,
  RegisterBody,
  SuccessResponse,
} from "@atlas/schema";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  authorizeUrl,
  configuredProviders,
  fetchProfile,
  isConfigured,
  type OAuthProfile,
  type OAuthProviderName,
} from "../modules/auth/oauth";
import { hashPassword, verifyPassword } from "../modules/auth/password";
import { isUniqueViolation } from "../utils/prisma-errors";
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

      let user: Awaited<ReturnType<typeof app.prisma.user.create>>;
      try {
        user = await app.prisma.user.create({
          data: {
            email,
            name: request.body.name.trim(),
            passwordHash: await hashPassword(request.body.password),
            authProvider: "PASSWORD",
          },
        });
      } catch (error) {
        /*
          Two people can submit the same address at the same moment and both
          pass the check above. The unique index is the real arbiter, so the
          loser gets the same 409 as anyone else rather than a 500.
        */
        if (isUniqueViolation(error)) {
          return sendError(reply, 409, ErrorCodes.EMAIL_TAKEN, "That email is already registered.");
        }
        throw error;
      }

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

      /*
        An account created through a provider has no password to check against.
        Name the provider it was created with, so the message points at the
        button that will actually work.
      */
      if (user.passwordHash === null) {
        const provider = user.authProvider === "LINKEDIN" ? "LinkedIn" : "Google";
        return sendError(
          reply,
          400,
          ErrorCodes.USE_SOCIAL_LOGIN,
          `This account signs in with ${provider}.`,
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

  app.get(
    "/providers",
    { schema: { response: { 200: SuccessResponse(AuthProvidersData) } } },
    async (_request, reply) =>
      sendResponse(reply, 200, { providers: configuredProviders(app.config) }),
  );

  /*
    Social sign-in. Google and LinkedIn behave identically, so each provider
    gets two thin routes over one shared pair of handlers. Paths are spelled out
    rather than parameterised, per the no-path-parameters rule in PRD §7.
  */
  app.get("/google", { config: authRateLimit }, (request, reply) =>
    startOAuth(app, request, reply, "google"),
  );
  app.get("/google/callback", { config: authRateLimit }, (request, reply) =>
    finishOAuth(app, request, reply, "google"),
  );
  app.get("/linkedin", { config: authRateLimit }, (request, reply) =>
    startOAuth(app, request, reply, "linkedin"),
  );
  app.get("/linkedin/callback", { config: authRateLimit }, (request, reply) =>
    finishOAuth(app, request, reply, "linkedin"),
  );
};

/* --- social sign-in ---------------------------------------------------- */

type App = Parameters<FastifyPluginAsyncTypebox>[0];

/*
  The round trip to a provider leaves and re-enters the site, so the link
  between the two halves lives in a short signed cookie rather than in memory —
  that way it still works with more than one server process.

  sameSite "lax" is required, not a preference: the callback arrives as a
  top-level navigation from the provider's domain, and "strict" would withhold
  the cookie exactly then.
*/
const OAUTH_COOKIE = "atlas_oauth";
const OAUTH_COOKIE_MAX_AGE = 10 * 60;

type OAuthHandoff = { state: string; provider: OAuthProviderName; next: string };

/* Only same-site paths, so a crafted `next` cannot bounce someone off the site. */
function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/map";
}

function backToLogin(app: App, reply: FastifyReply, reason: string) {
  const url = new URL("/auth/login", app.config.FRONTEND_URL);
  url.searchParams.set("error", reason);
  return reply.redirect(url.toString());
}

async function startOAuth(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply,
  provider: OAuthProviderName,
) {
  if (!isConfigured(app.config, provider)) {
    return backToLogin(app, reply, "provider_unavailable");
  }

  const state = randomBytes(24).toString("base64url");
  const handoff: OAuthHandoff = {
    state,
    provider,
    next: safeNext((request.query as { next?: unknown }).next),
  };

  reply.setCookie(OAUTH_COOKIE, JSON.stringify(handoff), {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: app.config.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });

  return reply.redirect(authorizeUrl(app.config, provider, state));
}

async function finishOAuth(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply,
  provider: OAuthProviderName,
) {
  const handoff = readHandoff(app, request);
  reply.clearCookie(OAUTH_COOKIE, { path: "/" });

  const query = request.query as { code?: unknown; state?: unknown; error?: unknown };

  // The visitor pressed cancel on the consent screen. Not an error worth shouting about.
  if (typeof query.error === "string") return backToLogin(app, reply, "cancelled");

  /*
    The state has to match the cookie this server set. Without that check
    anyone could feed a victim a callback URL carrying their own code and log
    the victim into the attacker's account.
  */
  if (!handoff || handoff.provider !== provider || handoff.state !== query.state) {
    return backToLogin(app, reply, "expired");
  }
  if (typeof query.code !== "string") return backToLogin(app, reply, "failed");

  let profile: Awaited<ReturnType<typeof fetchProfile>>;
  try {
    profile = await fetchProfile(app.config, provider, query.code);
  } catch (error) {
    request.log.error({ err: error, provider }, "OAuth sign-in failed");
    return backToLogin(app, reply, "failed");
  }

  /*
    Accounts are matched on email, so an unverified one must not be trusted —
    otherwise signing up elsewhere with someone's address would hand over their
    account here.
  */
  if (!profile.emailVerified) return backToLogin(app, reply, "email_unverified");

  const user = await linkOrCreateUser(app, provider, profile);
  if (!user) return backToLogin(app, reply, "failed");

  app.startSession(reply, user);
  return reply.redirect(new URL(handoff.next, app.config.FRONTEND_URL).toString());
}

function readHandoff(app: App, request: FastifyRequest): OAuthHandoff | null {
  const raw = request.cookies[OAUTH_COOKIE];
  if (!raw) return null;

  const unsigned = app.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;

  try {
    return JSON.parse(unsigned.value) as OAuthHandoff;
  } catch {
    return null;
  }
}

/*
  Three cases, in order: we have seen this provider account before; the email
  already has an account here (so link the two rather than making a duplicate,
  which is what makes "sign in with Google" work for someone who first signed up
  with a password); or this is a brand new person.
*/
async function linkOrCreateUser(app: App, provider: OAuthProviderName, profile: OAuthProfile) {
  const idField = provider === "google" ? "googleId" : "linkedinId";
  const authProvider = provider === "google" ? "GOOGLE" : "LINKEDIN";

  const byProvider = await app.prisma.user.findFirst({
    where: { [idField]: profile.providerId, deletedAt: null },
  });
  if (byProvider) return byProvider;

  const byEmail = await app.prisma.user.findFirst({
    where: { email: profile.email, deletedAt: null },
  });

  if (byEmail) {
    return app.prisma.user.update({
      where: { id: byEmail.id },
      // The password, if there is one, stays usable. Linking adds a way in, never removes one.
      data: {
        [idField]: profile.providerId,
        avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl,
      },
    });
  }

  try {
    return await app.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        authProvider,
        [idField]: profile.providerId,
      },
    });
  } catch (error) {
    // Someone registered the same address in the moment between the two queries.
    if (!isUniqueViolation(error)) throw error;
    return app.prisma.user.findFirst({ where: { email: profile.email, deletedAt: null } });
  }
}

export default authRoutes;
