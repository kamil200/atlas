# One image, one process: Fastify serves the API and the built web app from the
# same origin. That keeps cookies and OAuth redirects simple, and it is one Fly
# machine rather than two deployments that have to agree about CORS.

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
# openssl is what Prisma's query engine links against on slim images.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- dependencies -----------------------------------------------------------
# Manifests are copied on their own so a source-only change does not reinstall
# the whole dependency tree on every build.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/schema/package.json packages/schema/
RUN pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM deps AS build
COPY . .
# The Prisma client is generated code; it has to exist before anything typechecks.
RUN pnpm --filter @atlas/database exec prisma generate
RUN pnpm --filter @atlas/web build

# Drop the build-only tree.
#
# `pnpm prune --prod` alone does almost nothing here: every workspace package
# stays in the graph, so the web app's runtime dependencies (MapLibre, lucide)
# are kept even though they are already bundled into dist and nothing imports
# them from node_modules again. The toolchain has to go by name.
#
# tsx and the Prisma CLI are genuinely runtime dependencies in this image — one
# runs the server, the other applies migrations at boot — which is why they were
# moved out of devDependencies rather than deleted here.
# Only packages that provably do not run in this image. `effect` and
# `typescript` look like build tooling and are not: the Prisma CLI requires both
# at runtime, and deleting them makes `migrate deploy` fail at boot with
# MODULE_NOT_FOUND. Anything not on this list stays.
RUN rm -rf /app/apps/web/src /app/apps/web/public \
 && rm -rf /app/node_modules/.pnpm/@biomejs* \
           /app/node_modules/.pnpm/@turbo* /app/node_modules/.pnpm/turbo@* \
           /app/node_modules/.pnpm/@rolldown* /app/node_modules/.pnpm/vite@* \
           /app/node_modules/.pnpm/maplibre-gl@* /app/node_modules/.pnpm/lucide-react@* \
           /app/node_modules/.pnpm/vitest@* /app/node_modules/.pnpm/@vitest*

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/apps/web/dist

COPY --from=build /app /app

# Resumes land here. Fly gives it a volume in fly.toml; without one they are
# lost on redeploy, which the README says plainly.
ENV RESUME_STORAGE_DIR=/data/resumes
RUN mkdir -p /data/resumes

EXPOSE 3000
# Migrations run at boot rather than in the build, because the build has no
# database to talk to. `migrate deploy` only applies committed migrations and
# never generates one, so it is safe to run on every machine start.
CMD ["sh", "-c", "pnpm --filter @atlas/database exec prisma migrate deploy && pnpm --filter @atlas/server start"]
