# Atlas

**Atlas** is a book of maps rather than a list of links. It puts every startup hiring in your city on one map, so finding your next job feels like walking your own neighbourhood instead of grinding through a list.

Instead of a job feed, you explore an interactive map of startups, filter with live facet counts, open a company's full profile (founders, funding, investors, open roles), save and track applications, upload a resume, and apply in-app.

> **Demo data.** The companies are real and the facts are public and approximate. The roles are generated. Nothing here is a live listing, and no application reaches anyone.

---

## Quickstart

```bash
docker compose up -d && pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev
```

The web app runs on <http://localhost:5173> and the API on <http://localhost:3000>. Vite proxies `/api` to the server, so the browser only ever talks to one origin and cookies just work.

Sign in with either seeded account, password `Password123!`:

| Email | Role |
|---|---|
| `demo@atlas.dev` | regular user |
| `admin@atlas.dev` | admin, sees the review queue |

Postgres is mapped to host port **5434** rather than 5432, because a local Postgres install usually already owns 5432.

### Commands

```bash
pnpm dev             # web on :5173, API on :3000
pnpm validate        # lint + typecheck + test — run before calling anything done
pnpm db:seed         # wipe and rebuild the database, deterministically
pnpm db:seed:check   # assert the seed is actually usable
pnpm facets:check    # assert the facet counts are honest
```

---

## Architecture

```mermaid
flowchart LR
  subgraph browser["apps/web · React 19"]
    URL["URL search params<br/>filters + open sidebar"]
    RTK["RTK Query cache<br/>the only global state"]
    MAP["MapCanvas<br/>one MapLibre instance"]
  end

  subgraph server["apps/server · Fastify 5"]
    ROUTES["routes/"]
    CF["compileFilters<br/>the one filter module"]
    SER["serializers<br/>BigInt and Date leave here"]
  end

  subgraph shared["packages/"]
    SCHEMA["@atlas/schema<br/>TypeBox contracts"]
    DB["@atlas/database<br/>Prisma + seed"]
  end

  URL -->|"strip UI keys, sort"| RTK
  RTK -->|"filters only, never the viewport"| ROUTES
  RTK -->|"setData"| MAP
  ROUTES --> CF --> DB
  ROUTES --> SER
  SCHEMA -.->|"validates requests"| ROUTES
  SCHEMA -.->|"types endpoints"| RTK
```

```
apps/web       React 19, Vite 8, TanStack Router, RTK Query, MapLibre GL 5, Tailwind v4, shadcn/ui
apps/server    Fastify 5, TypeBox, Prisma 6, Postgres 16, argon2, local-disk storage adapter
packages/schema    TypeBox contracts both sides import — the single source of truth
packages/database  Prisma schema, migrations, deterministic seed, acceptance script
```

---

## Decision log

Every choice here should survive being explained in two plain sentences. Where two approaches worked, the boring one won.

**No PostGIS.** Coordinates are floats with a btree index, because there are two thousand offices rather than two million. PostGIS earns its keep when you need radius or polygon queries; that is the documented trigger for adding it.

**The map ships the whole filtered set at once, with no bbox.** The response is a few hundred thin rows, about 23KB gzipped, so MapLibre clusters it in a worker and panning costs zero network. Bbox queries make sense past tens of thousands of points.

**One `Application` model for saved and applied.** A save and an application are the same thing — a user and a job — at different stages. Two tables would mean moving rows between them the moment someone applies to something they saved, and the unique `(userId, jobId)` index makes saving an idempotent upsert instead.

**Facet counts leave out their own filter.** Each of the seven dimensions is counted with every *other* filter applied. Counted the obvious way, ticking "Remote" would drop the other work modes to zero and you could never widen the selection again. The seven queries run together, because sequentially this would be seven round trips for something that has to feel instant.

**One filter module.** `compileFilters.ts` is the only place filters become Prisma queries — the map, the company list, the job list, and all seven facet counts go through it. Forked filter logic does not crash; it makes those four surfaces quietly disagree, with no single place to fix it.

**A job's location is its office; a remote job sits at its company's HQ.** Remote roles are pinned nowhere, so without this rule they would vanish from the map entirely. One rule keeps the pins, the job list, and the city facet agreeing.

**Submissions are companies from birth.** A submission creates a real `Company` row marked `PENDING` plus a sidecar row for who sent it. Approving flips one enum instead of copying data between tables, which is why every public query must filter through the shared visibility helpers.

**Filters live in the URL, and the sidebar does too.** Back and forward walk the history, a link carries the whole view, and a reload restores it. Critically, the company panel is a search param rather than a nested route, so nothing above the map can unmount it while you browse.

**The viewport never enters a query key.** Clustering already happened in the browser, so pan and zoom are purely client-side. Putting `map.getBounds()` in a cache key would refetch on every drag.

**No build step for the server.** It runs through tsx, because the shared packages ship TypeScript source and bundling them buys nothing at this size.

---

## Things that went wrong, and what fixed them

**The type provider silently mistyped every enum.** `@fastify/type-provider-typebox` v6 is built against the new `typebox` package while this repo pins `@sinclair/typebox` 0.34. The mismatch collapsed every enum union to its first member — `sort` was typed `"recent"` with `"salary"` unreachable — and nothing failed at runtime. Pinned back to v5, which peers against 0.34.

**Dark mode leaked into a light-only product.** Tailwind's default `dark:` variant follows the operating system, and shadcn components ship `dark:` classes. On a machine set to dark mode those quietly overrode brand colours; a checked filter box rendered ink instead of peepal green. v1 is light-only on purpose, so the variant is now tied to a `.dark` class that is never set. That switches off every shadcn dark rule at once and leaves a clean path to real dark mode later.

**MapLibre measured its container once and kept the answer.** The canvas sat at its 400×300 default because the map was constructed before layout settled. A `ResizeObserver` tells it about the first layout pass and about the filter panel collapsing.

**The command palette filtered its results twice.** cmdk filters client-side by default, so server results whose `value` did not match the raw input were hidden. The palette composes `Dialog` and `Command` directly in order to pass `shouldFilter={false}`.

**A "not hiring" company was advertising open roles.** Found while testing the API. Quiet companies now keep only closed roles, and the seed acceptance script asserts the invariant so it cannot come back.

---

## Tests

`pnpm validate` runs lint, typecheck, and 115 tests. CI additionally starts a real Postgres, migrates, seeds, and runs both assertion scripts.

| Area | What it pins down |
|---|---|
| `compile-filters` | AND/OR semantics, `omit` removing exactly one dimension, visibility base always present |
| `api.integration` | facet sums reconcile, hidden rows stay hidden, map pins count every open role once, save/apply upsert |
| `auth` | argon2 round-trip, expired/tampered/foreign-signed tokens rejected |
| `contracts` | repeated query params coerce to arrays, bad enums rejected, Prisma↔schema enum parity, BigInt survives `JSON.stringify` |
| `storage` | put/get/delete round-trip, and a key that tries to escape its root |
| `use-cluster-layer` | GeoJSON coordinate order and flat primitive properties |
| `seed-determinism` | two runs produce identical data; quiet companies have no open roles |
| `derive-stats` | week bucketing, roles with no salary excluded from bands, bands ordered as a ladder |
| `regressions` | one test per bug in the log below, each written to fail against the old code |

Two assertion scripts back the suite up. `pnpm db:seed:check` proves the seed is usable — every facet dimension has at least two non-empty buckets, every department has an open role, and no office sits outside its own city. `pnpm facets:check` proves the counts are honest — each dimension sums to its own population and siblings survive a selection.

Deliberately skipped: MapLibre visual tests (no WebGL in jsdom), snapshots, and end-to-end tests. The map's lifecycle rules were verified by hand instead — clicking a real pin, opening the sidebar, and confirming the map instance, the canvas element, and the camera were all unchanged.

---

## Deploying

Free, and it stays free. One Koyeb container serves both the API and the built web app from the same origin, with Postgres on Neon. Single origin is deliberate: two deployments would have to agree about CORS, cookie domains, and OAuth redirect origins, and none of that buys anything at this size.

Neither service needs a credit card.

Verify the image locally before touching either of them. This catches everything except the hosting wiring.

```bash
docker build -t atlas . && docker run -p 8080:3000 \
  -e DATABASE_URL="postgresql://atlas:atlas@host.docker.internal:5434/atlas" \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e COOKIE_SECRET="$(openssl rand -base64 48)" \
  -e FRONTEND_URL="http://localhost:8080" atlas
```

**1. Database.** Create a project at neon.tech and copy the pooled connection string. Prisma needs `sslmode=require`. Leave autosuspend on. The free plan allows 100 compute-hours a month and a permanently awake 0.25 CU instance would want about 182, so autosuspend is what keeps it inside the limit. The cost is the database taking a moment to wake on the first request.

**2. Service.** Point Koyeb at the GitHub repo and choose the Dockerfile builder, the Free instance type, and Frankfurt or Washington. Set the health check to HTTP on port 3000 at `/api/health`. The web console is the reliable route; the `koyeb` CLI can do the same thing but its flag names move around, so this is written for the console.

**3. Environment.** `PORT=3000` and `NODE_ENV=production` as plain variables. `DATABASE_URL`, `JWT_SECRET` and `COOKIE_SECRET` as secrets, and `FRONTEND_URL` set to the app's public URL once Koyeb assigns it. The server validates all of these at boot and crashes immediately if one is missing, rather than failing later on the first request that needed it.

**4. Seed once**, since the demo data is the product. Migrations apply themselves at container start, but seeding is deliberately manual so a restart can never wipe live data. Run it against the Neon URL from your own machine.

```bash
DATABASE_URL="postgresql://…?sslmode=require" pnpm --filter @atlas/database seed
```

### What the free tier costs you

Three real limits, none of them fatal for a portfolio piece.

The instance is 512MB of RAM, 0.1 vCPU and 2GB of disk. That is why the image is built the way it is; a 1.3GB image on a 2GB disk with a tenth of a core is the difference between a usable demo and a broken one.

It scales to zero after an hour without traffic and this cannot be disabled, so the first visitor after a quiet spell waits for a cold start. Everything after that is instant.

There are no persistent volumes, so uploaded resumes live only as long as the container. Fine for a demo, and the storage adapter in `modules/storage` is S3-swappable for when it stops being fine.

If any of that becomes annoying, Fly.io runs the same Dockerfile unchanged for roughly $3.50 a month with a machine kept permanently warm.

### Social sign-in

Optional. A provider with no client id *and* secret simply does not appear on the sign-in page, and password auth carries the demo. Add each as a secret and register the redirect URI verbatim with the provider.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` as `https://<app>.koyeb.app/api/auth/google/callback`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` as `https://<app>.koyeb.app/api/auth/linkedin/callback`

LinkedIn needs the "Sign In with LinkedIn using OpenID Connect" product enabled on the app, which grants the `openid profile email` scopes this uses.

### Image size

779MB, down from 1.34GB, and the reason is worth knowing because the obvious approaches do not work.

`pnpm prune --prod` on the built tree barely helps. Every workspace package stays in the graph and the web app's dependencies are `dependencies`, so MapLibre, React and lucide all survive even though they are already bundled into `dist` and nothing imports them again.

Deleting the toolchain by name is worse. It looks fine and then fails at boot: `effect` and `typescript` read like build tools but the Prisma CLI requires both, and removing them produced a container that died on start with `MODULE_NOT_FOUND`. That was caught by running the image, not by building it.

What works is a second, independent install that never sees the web app. `pnpm install --prod --filter @atlas/server...` resolves only the server and what it depends on, so the web app leaves the graph entirely and the toolchain leaves with it. The runtime stage copies that tree, the server source, and `apps/web/dist` — nothing else.

The remaining bulk is the Prisma client and query engine at about 126MB, which is the floor without heavier surgery. Compiling the server so `tsx` is not a runtime dependency would take off another slice; that is a build-system change and is on the v2 list rather than done badly here.

### Social sign-in

Optional. A provider with no client id *and* secret simply does not appear on the sign-in page, and password auth carries the demo. Add each as a secret and register the redirect URI verbatim with the provider.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` as `https://<app>.koyeb.app/api/auth/google/callback`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` as `https://<app>.koyeb.app/api/auth/linkedin/callback`

LinkedIn needs the "Sign In with LinkedIn using OpenID Connect" product enabled on the app, which grants the `openid profile email` scopes this uses.

### Image size

964MB. Most of it is the pnpm virtual store: every workspace package's production tree is kept, so the web app's dependencies survive even though they are already bundled into `dist` and nothing imports them again at runtime. The Dockerfile deletes the toolchain it can prove is unused, and no more than that — `effect` and `typescript` look like build tooling but the Prisma CLI needs both at boot, and removing them fails with `MODULE_NOT_FOUND`.

The real fix is to compile the server to JavaScript so `tsx` is not a runtime dependency, then use `pnpm deploy --prod` to emit a self-contained tree for the server alone. That is a build-system change rather than a Dockerfile one, so it is on the v2 list rather than done badly here.

---

## Brand

The palette is green-led. Peepal green is the tree at the centre of every Indian square; marigold is the garland strung across it.

| | Token | Role |
|---|---|---|
| ⬛ | `ink` `#191A1C` | Text and primary buttons |
| 🟩 | `peepal-600` `#1B7F4D` | The mark, map pins, clusters, checked states |
| 🟩 | `peepal-700` `#136640` | Links and pressed states |
| 🟨 | `marigold-500` `#F5B301` | The dot motif and the selected-pin ring |
| ⬜ | `stone` `#B0B3BA` | Quiet, not-hiring pins |

If it is Atlas or you can act on it, it is peepal. Marigold is never text and never a large surface. Type is a display serif for headlines, Inter for the product, and JetBrains Mono for counts and coordinates — `12.97°N 77.59°E`.

Full guide in [`brand/BRAND.md`](brand/BRAND.md).

---

## Not built, on purpose

Job alerts were cut, because a CRUD API with no delivery is half a feature. Also on the v2 list: refresh-token rotation, dark mode (a token swap, now that the variant is class-based), PostGIS radius search, `pg_trgm` search, server-side clustering past ten thousand offices, resume parsing, and company claiming.

The lofi track behind the music toggle is not committed for licensing reasons. Drop any CC0 loop at `apps/web/public/audio/lofi.mp3` and the toggle picks it up; until then it says so rather than pretending to play.

## Licence

MIT.
