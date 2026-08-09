# CLAUDE.md — Chowk

Map-first startup job discovery (nextdoor.company-style). **Read [PRD.md](PRD.md) first** — it is the single source of truth for scope, schema, API, and architecture. Brand tokens and voice live in [brand/BRAND.md](brand/BRAND.md). Decisions marked "locked" are not up for debate; build them as specified.

## The bar

This repo goes on a resume. Two forces, in this order:
1. **Simple.** Every design choice must be explainable in two plain sentences. If it needs a diagram, simplify it. Boring beats clever.
2. **Polished.** UI quality matches the reference product (nextdoor.company): microinteractions, skeletons, empty states, no layout shift. Polish is scope, not stretch — the list is in PRD §8 and BRAND §5.

## Stack

pnpm 10 + Turborepo 2. Major versions matter — don't write for older APIs:

- **apps/web** — React 19, Vite 8, TypeScript strict, Tailwind v4 (CSS-first `@theme`, no JS config), shadcn/ui, TanStack Router v1 (file-based, typed search params), Redux Toolkit 2 + RTK Query, MapLibre GL 5, lucide-react. Fonts: Rozha One (display), Inter (UI), JetBrains Mono (data garnish) via @fontsource
- **apps/server** — Node 24, Fastify 5, @fastify/type-provider-typebox, TypeBox 0.34, Prisma 6, PostgreSQL 16
- **packages/schema** — @chowk/schema, shared TypeBox contracts (API shapes + router search params). Reuse before defining new types
- **packages/database** — @chowk/database, Prisma schema, migrations, deterministic seed
- Biome 2, Vitest 4, GitHub Actions

## Commands

```bash
pnpm db:up          # docker compose postgres
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # deterministic reseed (dev only)
pnpm dev            # web :5173 + server :3000 (vite proxies /api → 3000)
pnpm validate       # lint + typecheck + test — run before calling anything done
pnpm lint:fix       # biome check --write
```

## Non-negotiable rules

**API**
- Every response uses the envelope: `{success:true,data}` / `{success:false,error:{code,message}}` via `sendResponse`/`sendError`. No bare payloads.
- Every public query goes through the shared visibility helpers (`submissionStatus: APPROVED`, `deletedAt: null`, job `status: OPEN`). Never inline these at call sites.
- All filter-consuming endpoints use `modules/filters/compileFilters.ts`. The filter logic must never fork.
- Prisma BigInt never reaches `JSON.stringify` — convert at the serializer boundary.
- Request/response/query schemas come from `@chowk/schema`, never defined inline in routes.

**Frontend**
- RTK Query cache is the source of truth. Never mirror server state into `useState`/`useEffect`; derive from hooks.
- Filter + sidebar state (`companySlug`, `jobId`) live in `/map` URL search params. No nested routes under /map — the map must never unmount while browsing.
- Map viewport never enters an RTK Query arg. One MapLibre instance, created once, updated imperatively (`setData`, `flyTo`). Popups: `createRoot` + `setDOMContent`, unmounted on close.
- shadcn components live in `components/ui/` untouched; app components compose them. Icons from lucide-react only. Colors and fonts only via BRAND tokens — no raw hex in components.
- Every async surface ships loading (skeleton), empty (warm one-liner + action), and error (toast + retry) states. Copy comes from BRAND §6.

**Comments — simple English (owner's explicit rule)**
- Short plain sentences a junior dev reads without a dictionary. Explain *why*, not *what*.
- Good: `// Facet counts skip their own filter so checking "Remote" doesn't zero out the other options.`
- Bad: `// increment counter`, `// leverage memoization paradigm for perf`.
- Every non-obvious decision gets one sentence at the site. Obvious lines get nothing.

**Quality**
- TS strict; no `any` without an inline one-line justification.
- Tests for logic (filter compilation, upserts, auth helpers, transforms) — not presentational components. Every bug fix gets a regression test.
- Scope discipline: every changed line traces to the current phase. Don't refactor adjacent code.
- Extract a shared helper only at the second real consumer. No config options with one caller.
- Conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). Commit per phase at minimum. `pnpm validate` green before done.

## Build order

Follow PRD §12 phases 0→8 strictly; don't start a phase before the previous phase's done-criteria pass. Riskiest: seed plausibility (2), MapLibre lifecycle (5), Google OAuth env config (3b — the only cuttable phase; time-box 30 min).

## Pitfalls

PRD §14 lists the eight known traps (MapLibre×React lifecycle, viewport-in-query-keys, facet self-filtering, OAuth redirect URI, Tailwind v4/shadcn drift, BigInt JSON, repeated query params, dev cookies). Read the relevant one before coding that area.

## Dev credentials (after seed)

`admin@chowk.dev` / `demo@chowk.dev`, password `Password123!`.
