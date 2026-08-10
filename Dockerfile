# One image, one process: Fastify serves the API and the built web app from the
# same origin. That keeps cookies and OAuth redirects simple, and it is one
# container rather than two deployments that have to agree about CORS.

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
# openssl is what Prisma's query engine links against on slim images.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Manifests are copied on their own, before any source, so editing a file does
# not invalidate the dependency layer and reinstall everything.
FROM base AS manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/schema/package.json packages/schema/

# --- build ------------------------------------------------------------------
# The full tree, including every dev tool, used only to produce apps/web/dist.
FROM manifests AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @atlas/database exec prisma generate
RUN pnpm --filter @atlas/web build

# --- production dependencies -------------------------------------------------
# A second, independent install that never sees the web app.
#
# This is the whole trick. `pnpm prune --prod` on the build tree barely helps,
# because every workspace package stays in the graph and the web app's
# dependencies are `dependencies` — so MapLibre, React and lucide survive even
# though they are already bundled into dist and nothing imports them again.
#
# Filtering the install to the server and what it depends on drops the web app
# from the graph entirely, and --prod drops the toolchain with it.
FROM manifests AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @atlas/server...
# The whole packages tree, because prisma.config.ts imports src/load-env and
# generate reads the config before it reads the schema.
COPY packages ./packages
RUN pnpm --filter @atlas/database exec prisma generate

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV WEB_DIST_DIR=/app/apps/web/dist

# Dependencies first, then source over the top. .dockerignore keeps node_modules
# out of the source copy, so this never clobbers the install.
COPY --from=prod-deps /app /app
COPY packages ./packages
COPY apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Where uploaded resumes go. On a host with no persistent volume they live only
# as long as the container, which is fine for a demo and stated in the README.
# The storage adapter is S3-swappable when that stops being fine.
ENV RESUME_STORAGE_DIR=/data/resumes
RUN mkdir -p /data/resumes

EXPOSE 3000
# Migrations run at boot rather than in the build, because the build has no
# database to talk to. `migrate deploy` only applies committed migrations and
# never generates one, so it is safe to run on every start.
CMD ["sh", "-c", "pnpm --filter @atlas/database exec prisma migrate deploy && pnpm --filter @atlas/server start"]
