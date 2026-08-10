import { existsSync } from "node:fs";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/*
  In production the API also serves the built web app, so Atlas is one Fly
  machine on one origin instead of two deployments that have to agree about
  CORS and cookie domains. In development this does nothing — Vite owns :5173
  and proxies /api here.

  Only the static files are registered here. The fall-through to index.html for
  client-side routes lives in the one not-found handler in app.ts, because
  Fastify allows exactly one of those per scope.
*/

declare module "fastify" {
  interface FastifyInstance {
    /** True when a built web app is present and being served from this process. */
    hasWebBuild: boolean;
  }
}

export default fp(async (app: FastifyInstance) => {
  const root = process.env.WEB_DIST_DIR ?? join(process.cwd(), "../web/dist");
  const serve = app.config.NODE_ENV === "production" && existsSync(root);

  app.decorate("hasWebBuild", serve);
  if (!serve) return;

  // wildcard:false so unmatched paths reach the not-found handler rather than 404ing here.
  await app.register(fastifyStatic, { root, wildcard: false });
});
