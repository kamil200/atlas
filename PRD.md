# PRD — Chowk

**Chowk** (चौक — the town square) is map-first startup job discovery: instead of scrolling a job list, you explore an interactive map of startups hiring in your city, filter with live facet counts, open a company's full profile (founders, funding, investors, open roles), save and track applications, upload a resume, and apply in-app. A resume-grade clone of nextdoor.company, India-first.

This document is self-contained. A builder agent should need nothing beyond this file (plus `brand/BRAND.md`) to ship v1 in one day. Where a decision was open, it has been made — do not relitigate decisions marked **locked**.

**The bar (from the project owner):** highest code quality, but every design decision simple enough to explain in an interview. Edge cases covered, cleverness avoided. Comments in short, simple English. UI polished to the reference product's level.

**The explainability test (locked):** every architectural choice in this repo must be explainable in two plain sentences. If explaining it needs a diagram, simplify it. When two approaches work, pick the boring one.

---

## 1. Product overview

Two surfaces:

**Landing page `/`** — marketing page that sells the concept and shows the product for real: three feature sections embed live, interactive instances of actual app components (filter panel, company card, tracker) running on fixture data. Plus hero, logo marquee, testimonial wall, CTA, footer.

**Dashboard `/map`** — the product. Full-bleed MapLibre map with clustered company-office markers. Top bar with ⌘K search, saved/applied counters, avatar menu. Collapsible left filter panel with facet counts. Click a marker → popup card → expand into a right sidebar with full company detail and open jobs. Save jobs, mark applied, simple-apply with a resume and cover note. Stats pill showing "N companies · M jobs". Time-of-day greeting overlay with a rotating quote. Locate-me, zoom controls, and a background-music toggle easter egg.

Supporting routes: tracker, resume settings, submit-a-company (form + your past submissions with status), admin review queue, auth pages, and deep links for companies/jobs.

### Feature list (v1)

| Feature | Description |
|---|---|
| Map discovery | Clustered markers for every office of every approved company; cluster click zooms in; point click opens popup |
| Filters + facets | Hiring status, work mode, country, city, department, funding stage, investors — each option shows a live count |
| ⌘K search | Companies, jobs, and cities in one command palette |
| Company profile | Logo, tagline, about, industries, founded year, team size, funding stage, total funding, valuation, key investors, founders with LinkedIn links, offices, open jobs |
| Job detail | Title, department, location, work mode, seniority, salary band, description, external apply link or in-app simple apply |
| Save / track | Bookmark jobs; tracker page groups by status: Saved, Applied, Interviewing, Offer, Rejected, Withdrawn |
| Simple apply | In-app apply: pick an uploaded resume + optional cover note |
| Resume manager | Upload (pdf/doc/docx ≤5MB), list, delete, set default |
| Add company | Authenticated multi-step submission form → PENDING → admin approves → appears on map; submitter sees their submissions' status |
| Admin queue | List pending submissions, approve/reject with note |
| Auth | Email/password + Google OAuth, JWT in httpOnly cookie |
| Delight | Greeting overlay, quote of the day, lofi music toggle, globe projection when zoomed out |

### Non-goals (v1)

Job alerts (cut entirely — a CRUD API with no delivery is a half-feature that muddies the story; it returns in v2 with real delivery), payments/subscriptions, LinkedIn OAuth, scraping real ATS data, mobile apps, i18n, SSR/SEO beyond meta tags, dark mode (tokens are semantic so it's a v2 token swap), E2E tests.

---

## 2. Tech stack (locked)

Major versions matter — write for these APIs, not older ones.

| Layer | Choice |
|---|---|
| Monorepo | pnpm 10 workspaces + Turborepo 2 |
| Frontend | React 19, Vite 8, TypeScript 5 (strict), Tailwind CSS v4, shadcn/ui, TanStack Router v1 (file-based, typed search params), Redux Toolkit 2 + RTK Query, lucide-react icons |
| Fonts | @fontsource/rozha-one (display), @fontsource-variable/inter (UI), @fontsource/jetbrains-mono (data garnish) — self-hosted |
| Map | MapLibre GL JS v5, OpenFreeMap vector tiles (no API key), native GeoJSON clustering |
| Backend | Node 24, Fastify 5, @fastify/type-provider-typebox, TypeBox 0.34, Prisma 6, PostgreSQL 16 (Docker) |
| Auth | @node-rs/argon2 (password hashing), @fastify/jwt + @fastify/cookie (httpOnly cookie session), @fastify/oauth2 (Google) |
| Uploads | @fastify/multipart → StorageAdapter interface → local disk (S3-swappable) |
| Tooling | Biome 2 (lint+format), Vitest 4, GitHub Actions CI |

Version pins for the important packages: `react@^19.2`, `vite@^8`, `@tanstack/react-router@^1.132`, `@reduxjs/toolkit@^2.11`, `maplibre-gl@^5`, `tailwindcss@^4`, `fastify@^5.8`, `prisma@^6.19`, `@prisma/client@^6.19`, `@sinclair/typebox@^0.34`, `@biomejs/biome@^2.4`, `vitest@^4.1`, `turbo@^2.9`.

Map style: `https://tiles.openfreemap.org/styles/positron` (light, minimal; keyless; keep MapLibre's attribution control on). Style URL lives in one constant.

---

## 3. Brand & design system (locked — full guide in `brand/BRAND.md`)

Name **Chowk**; lowercase wordmark `chowk` with a marigold full stop; logo mark = a map tile (four paper city blocks around a crossroads on a peepal-green tile, marigold dot at the center). SVGs in `brand/`. The palette is green-led: peepal is the tree at the center of every square, marigold the garland.

Tokens (the full Tailwind v4 `@theme` block is in BRAND.md §4 — copy it verbatim into `apps/web/src/index.css` and map shadcn's semantic variables onto it):

- Ground: `paper #FFFFFF`, raised `paper-2 #F2F3F6`, text `ink #191A1C`, borders `line #E3E5E9`
- **Peepal green** (scale 400–700, core `#1B7F4D`, links/badges `#136640`) = the brand AND the working color: tile, pins, clusters, links, focus, checked states, hiring badges. If it's Chowk or you can act on it, it's peepal
- **Marigold** `#F5B301` = the garland: the dot motif, selected-pin ring, tiny highlights. Never text, never large surfaces
- `stone #B0B3BA` = quiet/not-hiring pins and disabled; `danger #D64545`; tints `#DEF0E4` (applied), `#FCF1CE` (interviewing), `#E2F1E6` (hero pill)
- Primary CTA = ink background, paper text (reference-style black buttons)
- Type: Rozha One (display), Inter (UI), JetBrains Mono (tiny uppercase meta: `92 COMPANIES · 1,486 JOBS`, coordinates)
- Radius 8/12/16/24, soft neutral shadows, motion 150/250ms ease-out-quart, everything behind `prefers-reduced-motion`

Voice: plain, warm, specific. Light Hinglish ONLY in delight moments (greeting, empty states, footer), never in errors, forms, or data. Button labels say what they do. Copy examples live in BRAND.md §6 — reuse them verbatim where they fit.

---

## 4. Monorepo layout

```
chowk/
├── apps/
│   ├── web/                      # React app (landing + dashboard)
│   │   └── src/
│   │       ├── routes/           # TanStack Router file-based routes
│   │       ├── components/       # ui/ (shadcn), map/, filters/, company/, tracker/, landing/
│   │       ├── store/            # store.ts + api/ (RTK Query slices)
│   │       ├── hooks/
│   │       ├── lib/              # utils, constants (APP_NAME, MAP_STYLE_URL, quotes)
│   │       └── demo/             # fixtures.ts for landing demoMode
│   └── server/
│       └── src/
│           ├── app.ts            # buildApp() — register plugins + routes (used by tests)
│           ├── index.ts          # listen()
│           ├── plugins/          # prisma, auth (jwt decorators), env, storage
│           ├── routes/           # auth/, companies/, jobs/, applications/, resumes/,
│           │                     #   facets/, search/, reference/, admin/
│           ├── modules/          # filters/compileFilters.ts, auth/password.ts, storage/
│           └── utils/            # sendResponse.ts, serializers.ts (BigInt→number)
├── packages/
│   ├── schema/                   # @chowk/schema — TypeBox contracts, SINGLE source of truth
│   └── database/                 # @chowk/database — prisma schema, migrations, seed
├── brand/                        # BRAND.md, logo.svg, logo-mark.svg, favicon.svg, MOCKUP-PROMPTS.md
├── docker-compose.yml            # postgres:16-alpine
├── turbo.json, biome.json
├── .github/workflows/ci.yml     # lint → typecheck → test → build
├── .env.example
└── README.md
```

Root scripts: `dev`, `db:up`, `db:migrate`, `db:seed`, `validate` (lint + typecheck + test), `lint:fix`, `build`, `test`.

Ports: server **3000**, web **5173**. Vite dev proxy forwards `/api` → `http://localhost:3000` — one origin in the browser, so cookies and CORS are a non-issue in dev.

---

## 5. Database schema (packages/database)

**Locked — no PostGIS.** At ≤2k offices a filter query is a few indexed float comparisons; PostGIS adds an image and raw-SQL escape hatches for zero benefit at this scale. Interview explanation: "I store lat/lng as floats with a btree index because I have two thousand points, not two million; PostGIS earns its keep when you need radius or polygon queries, which is my documented v2 trigger."

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum AuthProvider {
  PASSWORD
  GOOGLE
}

enum WorkMode {
  ONSITE
  HYBRID
  REMOTE
}

enum HiringStatus {
  ACTIVELY_HIRING
  NOT_HIRING
}

enum FundingStage {
  BOOTSTRAPPED
  PRE_SEED
  SEED
  SERIES_A
  SERIES_B
  SERIES_C
  SERIES_D_PLUS
  PUBLIC
}

enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ApplicationStatus {
  SAVED
  APPLIED
  INTERVIEWING
  OFFER
  REJECTED
  WITHDRAWN
}

enum ApplyMethod {
  SIMPLE_APPLY
  EXTERNAL
}

enum JobStatus {
  OPEN
  CLOSED
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String?                    // null when the account is Google-only
  authProvider AuthProvider @default(PASSWORD)
  googleId     String?      @unique
  name         String
  avatarUrl    String?
  role         UserRole     @default(USER)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  deletedAt    DateTime?

  applications       Application[]
  resumes            Resume[]
  companySubmissions CompanySubmission[]

  @@index([deletedAt])
}

model Company {
  id               String           @id @default(cuid())
  slug             String           @unique
  name             String
  logoUrl          String?
  tagline          String?
  description      String           @db.Text
  website          String?
  industries       String[]         @default([])
  foundedYear      Int?
  employeeCount    Int?
  hiringStatus     HiringStatus     @default(ACTIVELY_HIRING)
  fundingStage     FundingStage?
  totalFundingUsd  BigInt?
  valuationUsd     BigInt?
  submissionStatus SubmissionStatus @default(APPROVED)  // seed data is APPROVED
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  deletedAt        DateTime?

  offices    Office[]
  jobs       Job[]
  founders   CompanyFounder[]
  investors  CompanyInvestor[]
  submission CompanySubmission?

  @@index([submissionStatus, deletedAt])
  @@index([hiringStatus, deletedAt])
  @@index([fundingStage, deletedAt])
}

model Office {
  id          String    @id @default(cuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  city        String
  country     String    @default("India")
  addressLine String?
  lat         Float
  lng         Float
  isHq        Boolean   @default(false)
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?

  jobs Job[]

  @@index([lat, lng])
  @@index([city, deletedAt])
  @@index([companyId])
}

model Founder {
  id          String  @id @default(cuid())
  name        String
  linkedinUrl String?
  photoUrl    String?

  companies CompanyFounder[]
}

model CompanyFounder {
  companyId String
  founderId String
  title     String  // "Co-founder & CEO" — the role belongs to this company, so it lives on the join row
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  founder   Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)

  @@id([companyId, founderId])
  @@index([founderId])
}

model Investor {
  id      String  @id @default(cuid())
  name    String  @unique
  logoUrl String?
  website String?

  companies CompanyInvestor[]
}

model CompanyInvestor {
  companyId  String
  investorId String
  round      FundingStage?
  company    Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  investor   Investor      @relation(fields: [investorId], references: [id], onDelete: Cascade)

  @@id([companyId, investorId])
  @@index([investorId])
}

model Department {
  id   String @id @default(cuid())
  name String @unique
  slug String @unique

  jobs Job[]
}

model Job {
  id           String     @id @default(cuid())
  companyId    String
  company      Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  officeId     String?                     // null means remote-only, no pinned office
  office       Office?    @relation(fields: [officeId], references: [id], onDelete: SetNull)
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  title        String
  description  String     @db.Text
  workMode     WorkMode
  seniority    String?                     // "Entry" | "Mid" | "Senior" | "Lead" — free text
  salaryMin    Int?                        // annual, in `currency` units
  salaryMax    Int?
  currency     String     @default("INR")
  applyUrl     String?                     // external ATS link; null means simple-apply only
  status       JobStatus  @default(OPEN)
  postedAt     DateTime   @default(now())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  applications Application[]

  @@index([companyId, status, deletedAt])
  @@index([officeId, status, deletedAt])
  @@index([departmentId, status, deletedAt])
  @@index([workMode, status, deletedAt])
  @@index([postedAt])
}

model Application {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId       String
  job         Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  status      ApplicationStatus @default(SAVED)
  applyMethod ApplyMethod?                  // set the first time status becomes APPLIED
  resumeId    String?
  resume      Resume?           @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  coverNote   String?           @db.Text
  appliedAt   DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([userId, jobId])
  @@index([userId, status])
  @@index([jobId, status])
}

model Resume {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename   String
  storageKey String                        // key for the storage adapter — never a public URL
  mimeType   String
  sizeBytes  Int
  isDefault  Boolean   @default(false)
  createdAt  DateTime  @default(now())
  deletedAt  DateTime?

  applications Application[]

  @@index([userId, deletedAt])
}

model CompanySubmission {
  id            String    @id @default(cuid())
  companyId     String    @unique
  company       Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  submittedById String
  submittedBy   User      @relation(fields: [submittedById], references: [id])
  reviewedById  String?   // admin's user id; plain field on purpose — a second User relation buys nothing here
  adminNote     String?   @db.Text
  createdAt     DateTime  @default(now())
  reviewedAt    DateTime?

  @@index([submittedById])
}
```

### Schema design notes (put these in the README — they are the interview answers)

- **One `Application` model for saved AND applied.** A save and an application are the same thing (user × job) at different stages. Two tables would mean moving rows between tables when someone applies to a saved job. Unique `(userId, jobId)` makes save/apply an idempotent upsert.
- **Submissions are Companies from birth.** A user submission creates a real `Company` row with `submissionStatus=PENDING` plus a `CompanySubmission` sidecar for submitter/review metadata. Approval flips one enum — nothing migrates. **Every public query must filter `submissionStatus: APPROVED, deletedAt: null`** — bake this into shared helpers (`visibleCompanyWhere`), never inline it at call sites.
- **Soft delete** on User, Company, Office, Job, Resume only. Join rows and Application hard-delete (unsaving a job deletes the row — nothing to audit).
- **User-scoped queries skip the public visibility filters.** The tracker still shows a job that closed after you applied (with its current status), and an application keeps its resume reference after that resume is soft-deleted — that is exactly why Resume soft-deletes. Public browsing hides; personal history keeps.
- **Department is a table, not an enum** — adding a department is an insert, not a migration.
- **Founder/Investor are M:N** with join-row payload (`title` per company, `round` per investment) so the same investor powers facet counts across companies.

---

## 6. Shared contracts (packages/schema)

TypeBox is the single source of truth. Both sides import from `@chowk/schema`:

- Fastify validates request/response with the exact schemas (via `@fastify/type-provider-typebox`).
- The frontend derives TS types (`Static<typeof T>`) for RTK Query endpoints.
- TanStack Router's `validateSearch` on `/map` uses `MapSearchParams`.

Key schemas (names are canonical — use exactly these):

```typescript
// filters — shared by /companies, /companies/map, /facets, /jobs
export const MapSearchParams = Type.Object({
  hiringStatus: Type.Optional(Type.Array(Type.Enum(HiringStatus))),
  workMode:     Type.Optional(Type.Array(Type.Enum(WorkMode))),
  country:      Type.Optional(Type.Array(Type.String())),
  city:         Type.Optional(Type.Array(Type.String())),
  department:   Type.Optional(Type.Array(Type.String())),   // department slugs
  fundingStage: Type.Optional(Type.Array(Type.Enum(FundingStage))),
  investorId:   Type.Optional(Type.Array(Type.String())),
  q:            Type.Optional(Type.String()),
  // UI state that lives in the URL but is stripped before hitting the API:
  companySlug:  Type.Optional(Type.String()),   // sidebar open/close
  jobId:        Type.Optional(Type.String()),   // job detail inside the sidebar
});

export const OfficeMapPoint = Type.Object({
  officeId: Type.String(),
  companyId: Type.String(),
  companySlug: Type.String(),
  companyName: Type.String(),
  logoUrl: Type.Union([Type.String(), Type.Null()]),
  lat: Type.Number(),
  lng: Type.Number(),
  isHq: Type.Boolean(),
  hiringStatus: Type.Enum(HiringStatus),
  openJobCount: Type.Integer(),
});
```

Also define: `UserDto`, `CompanySummary`, `CompanyDetail` (offices + founders + investors + open jobs), `JobSummary`, `JobDetail`, `ApplicationDto` (with embedded `JobSummary`), `ResumeDto`, `FacetBucket {value,label,count}`, `FacetsResponse`, `SearchResponse`, auth request bodies, and the envelope helpers.

**Money fields**: DB stores `BigInt`; DTOs expose `number` (USD amounts fit in 2^53). Convert at the serializer boundary (`utils/serializers.ts`). Never let a raw Prisma BigInt reach `JSON.stringify` — it throws (see Pitfalls).

**Filter serialization**: provide `filtersToSearchParams(filters): URLSearchParams` in packages/schema — emits repeated params (`?workMode=REMOTE&workMode=HYBRID`), strips `companySlug`/`jobId`/empty arrays. RTK Query endpoints use this helper; TanStack Router keeps its own default URL serialization. The two layers are deliberately decoupled — do not try to make the browser URL byte-identical to the API query string.

---

## 7. API specification (apps/server)

**Envelope — every response, no exceptions:**

```typescript
{ success: true,  data: T }
{ success: false, error: { code: string, message: string } }   // + correct HTTP status
```

Implement `sendResponse(reply, status, data)` / `sendError(reply, status, code, message)` in `utils/` and use them in every handler. Error codes are SCREAMING_SNAKE (`INVALID_CREDENTIALS`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, …).

Auth tiers: **public** · **auth** (valid JWT cookie) · **admin** (auth + role=ADMIN). Implement as Fastify decorators (`app.authenticate`, `app.requireAdmin`) applied via route `onRequest` hooks.

Fastify config notes: register `@fastify/cookie` before `@fastify/jwt` (jwt reads the cookie, `cookie: { cookieName: 'chowk_session' }`); set ajv `coerceTypes: 'array'` so a single repeated query param (`?workMode=REMOTE`) parses as `["REMOTE"]`; plugins: helmet, rate-limit (100/min public, 20/min auth mutations, 10/min on /api/auth/*), sensible, multipart (5MB cap), pino logger with request ids.

### Endpoints

**Identity convention (owner's call, locked): no path parameters anywhere.** GET and DELETE carry identity in the query string (`?slug=`, `?id=`, `?jobId=`); POST, PUT, and PATCH carry it in the JSON body. One rule, zero exceptions, and it mirrors the frontend's query-string URL state (`/map?companySlug=…`). Classic REST would use path params — this is a deliberate consistency choice, and flipping back later is mechanical since all schemas live in `@chowk/schema`.

| # | Method | Path | Auth | Request | Returns |
|---|---|---|---|---|---|
| 1 | POST | /api/auth/register | public | `{email, password, name}` (password ≥8) | `{user}` + sets cookie |
| 2 | POST | /api/auth/login | public | `{email, password}` | `{user}` + sets cookie |
| 3 | POST | /api/auth/logout | auth | — | `{}` + clears cookie |
| 4 | GET | /api/auth/me | auth | — | `{user}` |
| 5 | GET | /api/auth/google | public | — | 302 → Google consent |
| 6 | GET | /api/auth/google/callback | public | `?code&state` | 302 → `FRONTEND_URL/auth/callback` + cookie |
| 7 | GET | /api/companies | public | filters + `page`, `pageSize` (≤50) | `{items: CompanySummary[], total, page, pageSize}` |
| 8 | GET | /api/company | public | query `slug` | `{company: CompanyDetail}` |
| 9 | GET | /api/companies/map | public | filters (NO bbox) | `{offices: OfficeMapPoint[]}` |
| 10 | POST | /api/companies/submit | auth | company + offices + founders payload | `{companyId, submissionStatus}` |
| 10b | GET | /api/submissions/mine | auth | — | `{items: SubmissionWithCompany[]}` — the submitter's own, any status |
| 11 | GET | /api/admin/submissions | admin | `?status=PENDING` | `{items: SubmissionWithCompany[]}` |
| 12 | PATCH | /api/admin/submissions | admin | `{id, status: APPROVED\|REJECTED, note?}` | `{submission}` |
| 13 | GET | /api/facets | public | filters | `{hiringStatus, workMode, country, city, department, fundingStage, investors}` — each `FacetBucket[]` |
| 14 | GET | /api/jobs | public | filters + `page`, `pageSize`, `sort` | `{items: JobSummary[], total}` |
| 15 | GET | /api/job | public | query `id` | `{job: JobDetail}` |
| 16 | POST | /api/jobs/simple-apply | auth | `{jobId, resumeId, coverNote?}` | `{application}` |
| 17 | GET | /api/applications | auth | `?status=` | `{items: ApplicationDto[]}` |
| 18 | PUT | /api/applications | auth | `{jobId}` | `{application}` — idempotent save (upsert SAVED) |
| 19 | DELETE | /api/applications | auth | query `jobId` | `{}` — removes the row |
| 20 | PATCH | /api/applications | auth | `{jobId, status}` | `{application}` — tracker moves; APPLIED sets `appliedAt` once |
| 21 | POST | /api/resumes | auth | multipart file | `{resume}` |
| 22 | GET | /api/resumes | auth | — | `{items: ResumeDto[]}` |
| 23 | DELETE | /api/resumes | auth | query `id` | `{}` (soft delete) |
| 24 | PATCH | /api/resumes | auth | `{id, isDefault: true}` | `{resume}` — unsets others transactionally |
| 25 | GET | /api/resumes/download | auth | query `id` | file stream (ownership-checked) |
| 26 | GET | /api/search | public | `?q=` (≥2 chars) | `{companies: [], jobs: [], locations: []}` (≤7 each) |
| 27 | GET | /api/departments | public | — | `{items: Department[]}` |
| 28 | GET | /api/investors | public | `?q=` | `{items: Investor[]}` |
| 29 | GET | /api/health | public | — | `{status: "ok"}` |

### Filter semantics (locked)

Params repeatable: OR **within** a dimension, AND **across** dimensions. `city=Bengaluru&workMode=REMOTE&workMode=HYBRID` = in Bengaluru AND (remote OR hybrid). Job-level dimensions (workMode, department) filter companies via "has ≥1 OPEN job matching"; `hiringStatus`/`fundingStage`/`investorId` are company-level; `country`/`city` are office-level.

### `compileFilters` — the one shared filter module

`apps/server/src/modules/filters/compileFilters.ts` exports `compileCompanyWhere(filters, {omit?})` and `compileJobWhere(filters, {omit?})`, returning Prisma `where` objects. **Every** filter-consuming endpoint (7, 9, 13, 14) imports these — the logic must never fork. Always merges the visibility base (`submissionStatus: APPROVED`, `deletedAt: null`, job `status: OPEN`).

### Map endpoint strategy (locked)

**No bbox param. No server-side clustering.** Return every office matching the filters (≤2k rows, thin DTO, well under 100KB gzipped). MapLibre's `cluster: true` GeoJSON source clusters in a worker; pan/zoom never triggers a network request. Interview explanation: "The whole filtered dataset fits in one small response, so I ship it once and let the map cluster locally — panning costs zero network. Bbox queries make sense past tens of thousands of points; that's my documented v2 trigger." `openJobCount` = count of OPEN jobs pinned to that office plus, for HQ only, the company's remote jobs (so remote-only roles surface somewhere).

Office visibility rule (locked): an office appears when its company passes company-level filters and the office passes location filters; if any job-level filter (department, work mode) is active, the office must also have ≥1 OPEN job matching it. `openJobCount` is always computed under the active job-level filters — pins never claim roles the filter excluded. With no filters, offices with zero open jobs still appear (their company may simply be listed, like the reference's "not hiring" companies).

### Facets strategy (locked)

For each of the 7 dimensions run a grouped count applying **all other dimensions' filters but not its own** (`compileFilters(filters, {omit: dim})`) — otherwise checking a box zeroes out its siblings. Run all 7 via `Promise.all`, never sequentially. Country/city group over offices of matching companies; department/workMode group over jobs; investors count distinct matching companies per investor (top ~150 by count). At this data volume the whole endpoint is single-digit ms — no caching.

### Auth flows

**Password**: register hashes with argon2id (@node-rs/argon2 defaults), signs JWT `{sub: userId, role}` (7d expiry), sets cookie `chowk_session` (httpOnly, sameSite=lax, secure in prod, path=/). Login verifies + same cookie; a Google-only account (null `passwordHash`) gets a clear "use Google sign-in" error — the no-silent-merge rule in the other direction. Logout clears it. Refresh-token rotation is a documented v2 item — note it in README, don't build it.

**Google OAuth** (@fastify/oauth2, GOOGLE_CONFIGURATION, scopes `openid email profile`, state check enabled): callback exchanges code, fetches userinfo, then: existing user by `googleId` → login; else email exists with `authProvider=PASSWORD` → redirect to FE with `?error=use_password_login` (**no silent account merge**); else create user (`authProvider=GOOGLE`, avatar from profile). Set cookie, 302 to `FRONTEND_URL/auth/callback`. Canonical dev redirect URI, registered verbatim in Google Cloud Console and in `.env.example`: `http://localhost:3000/api/auth/google/callback`. **If OAuth config fights back >30 min, ship password-only and log it as fast-follow — do not burn the day.**

### Resume upload

Validate mimetype (`application/pdf`, `application/msword`, `…wordprocessingml.document`) AND extension, cap 5MB (multipart limits + explicit check). `StorageAdapter` interface `{put(key, stream, meta), get(key), delete(key), getSignedUrl?(key, ttl)}` with `LocalDiskStorageAdapter` writing under `RESUME_STORAGE_DIR` (default `apps/server/uploads/`, gitignored), key = `resumes/{userId}/{cuid}-{sanitizedFilename}`. The first resume a user uploads becomes their default automatically. Download streams through the API with ownership check — storage paths never leak. S3 later = new adapter only.

---

## 8. Frontend specification (apps/web)

### Routes (TanStack Router, file-based)

```
__root.tsx            providers (Redux, Router), TopBar, Toaster, global ⌘K listener, error boundary
index.tsx             landing page
map.tsx               THE dashboard — validateSearch: MapSearchParams
companies.$slug.tsx   redirect → /map?companySlug=$slug (deep link)
jobs.$jobId.tsx       redirect → /map?jobId=$jobId
auth.login.tsx        auth.register.tsx        auth.callback.tsx
tracker.tsx           settings.resumes.tsx     submit-company.tsx
admin.submissions.tsx (route guard: role=ADMIN)
```

### The two architectural rules (locked — violations are bugs)

1. **Sidebar state lives in search params** (`companySlug`, `jobId`) on `/map`, NOT nested routes — the map component must never unmount while browsing companies. Verify: open/close sidebar, map center/zoom/GL context preserved.
2. **Viewport never enters RTK Query args.** Query args = filter dimensions only. Pan/zoom is purely client-side (clustering already happened). Never put `map.getBounds()` in a query key.

### MapCanvas lifecycle (the hardest component — follow exactly)

- `new maplibregl.Map()` once, in `useEffect` with `[]` deps, container `<div ref>`; `map.remove()` on unmount only.
- On `load`: add GeoJSON source `offices` (`cluster: true, clusterRadius: 50, clusterMaxZoom: 14`) + 3 layers: `clusters` (circle, size stepped by `point_count`, peepal-600 fill, paper text), `cluster-count` (symbol), `office-point` (circle; peepal-600 = actively hiring, stone = quiet).
- Data updates: `useGetCompaniesMapQuery(apiFilters)` → `useMemo` builds `FeatureCollection` → effect keyed on the query's `data` reference calls `source.setData(geojson)`. Guard for source-not-yet-added (map still loading) — retry on `load`.
- Cluster click → `getClusterExpansionZoom(clusterId)` → `easeTo`. Point click → popup: render React into a detached node via `createRoot`, pass to `new Popup({closeButton:false}).setDOMContent(node)`, `root.unmount()` on popup `close`. One popup at a time.
- Marker hover: pointer cursor + slight grow (feature-state). Selected: marigold-500 ring, 3px.
- Controls: custom zoom +/- buttons, locate-me (Geolocation API → `flyTo` zoom 12, graceful denial toast), globe flourish: `map.setProjection({type:'globe'})` — keep if trivial, drop if it fights (polish, not scope).

### Components (by area)

- **map/**: `MapCanvas`, `useClusterLayer` (pure GeoJSON transform — unit-testable), `MarkerPopup` (logo, name, hiring badge in peepal-700, open-role count, mono coords line, "View company →" sets `companySlug`), `MapControls`, `StatsPill` (ink pill, mono: "{companies} COMPANIES · {jobs} OPEN ROLES", from map response: distinct companyIds + Σ openJobCount)
- **filters/**: `FilterPanel` (collapsible; Accordion per dimension; Checkbox rows `label ···· count` with dotted leader, mono counts; counts from `useGetFacetsQuery(apiFilters)`; zero-count options disabled not hidden; "Clear all" link in peepal-700; mutations via `navigate({search: prev => …})`), investor dimension gets a search-within input (`/api/investors?q=`)
- **company/**: `CompanySidebar` (shadcn Sheet right, open = `!!companySlug`, lazy `useGetCompanyBySlugQuery`; header: logo, name, tagline, hiring badge, website, mono coords of HQ; Tabs: **Overview** (about, industries, founded, team size, funding stage, total funding, valuation, investor chips, founders with LinkedIn), **Offices** (rows; click → `flyTo`), **Jobs** (JobRow list)), `JobRow` (title, mono meta "dept · city · mode", bookmark toggle, applied check), `JobDetailPanel` (in-Sheet when `jobId` set: description, salary band, seniority, posted date; CTA: `applyUrl` → "Apply on company site ↗" + "Mark applied"; else "Simple apply" → `SimpleApplyDialog`), `SimpleApplyDialog` (resume Select with default preselected, cover note Textarea, submit → optimistic APPLIED + toast "Applied. Fingers crossed."; zero resumes → inline upload prompt)
- **tracker/**: `TrackerBoard` (grouped list by status; card = company logo, job title, mono meta, dates; status Select per card → PATCH; remove → DELETE + confirm)
- **search/**: `CommandPalette` (shadcn Command in Dialog; ⌘K/ctrl+K; 250ms debounce ≥2 chars → `useLazySearchQuery`; groups: Companies → `companySlug`, Jobs → `jobId`+`companySlug`, Locations → set `city` filter; recent selections in localStorage, max 5)
- **landing/**: see §9
- **shared**: `TopBar` (logo → `/`, ⌘K trigger styled as a search input, SavedCounter + AppliedCounter chips, avatar DropdownMenu (Tracker, Resumes, Submit a company, Admin if role, Logout) or ink Login button), `GreetingOverlay` (first `/map` visit per session: time-of-day line from BRAND voice table + quote by day-of-year from a ~30-quote const; fade after 2.5s or first interaction; sessionStorage), `MusicToggle` (`<audio loop>` CC0 lofi from `/public/audio/`, OFF by default, localStorage preference)

### States — every async surface has all three (locked)

- **Loading**: skeletons that match final layout exactly (sidebar, filter counts, tracker rows); map gets a small corner spinner, never a blocking overlay
- **Empty**: one warm line + one action (BRAND voice table): empty tracker → "Nothing saved yet. Wander the map…"; zero filter results → "No startups match these filters. Loosen one and try again." + "Clear all" button
- **Error**: toast + inline retry button; error boundaries per route panel; never a blank white screen

### Accessibility bar (v1, non-negotiable)

Visible focus rings (peepal-500, 2px, offset 2) on everything interactive; full keyboard: ⌘K opens palette, Esc closes popup/sheet/dialog, focus trapped in dialogs and returned on close; `aria-pressed` on the bookmark toggle; alt text on logos; AA contrast per BRAND §2; `prefers-reduced-motion` kills all animation; filter checkboxes are real inputs with labels.

### UI polish bar (the "same as the reference" clause)

The reference product's feel comes from ~8 microinteractions, all specced in BRAND §5: bookmark pop + counter bump, popup scale-in from pin, cluster hover grow, card hover lift, greeting fade, filter-count crossfade with tabular-nums, sheet slide, button press states. Implement all of them; they are scope, not stretch. Spacing on a 4px grid; one shadow system; no default-blue focus outlines; no layout shift on data load (skeletons reserve space).

### RTK Query

One `baseApi` (`fetchBaseQuery({baseUrl: '/api', credentials: 'include'})`), per-domain injected endpoints, tagTypes: `Me, Company, CompanyMap, Facets, Job, Application, Resume, Submission`.

| Endpoint | Provides | Invalidates |
|---|---|---|
| getMe / login / register / logout | Me | auth mutations → everything user-scoped (`Application`, `Resume`, `Me`) |
| getCompaniesMap(filters) | CompanyMap | — |
| getCompanies / getCompanyBySlug | Company | — |
| getFacets(filters) | Facets | — |
| getJobs / getJobById | Job | — |
| getApplications | Application | — |
| saveJob (PUT) / unsaveJob (DELETE) / updateApplicationStatus (PATCH) / simpleApply | — | Application; **plus optimistic `onQueryStarted` patch of `getApplications` with `.undo()` on error** (bookmark toggles must be instant) |
| getResumes / uploadResume / deleteResume / setDefaultResume | Resume | Resume |
| search (lazy) | — (`keepUnusedDataFor: 5`) | — |
| submitCompany | — | Submission |
| getSubmissions / reviewSubmission | Submission | reviewSubmission → Submission + **CompanyMap + Facets** (approved company must appear) |

Rules: RTK Query cache is the source of truth — never mirror server state into `useState`/`useEffect`; derive from hooks. Logout dispatches `api.util.resetApiState()` — one line wipes every user-scoped cache instead of chasing tags. Auth-gated actions from logged-out state → redirect to `/auth/login?next=…`.

### State summary

URL search params = filters + sidebar (shareable, back/forward walks history). Redux = RTK Query cache only. Everything else is local component state or localStorage (music, recent searches). No other global state — this sentence is the interview answer.

---

## 9. Landing page specification

Brand world from `brand/BRAND.md`: paper ground, ink CTAs, peepal-green system with marigold dots, Rozha One display. Section order:

1. **Nav**: logo lockup, "Add company", ink Login button.
2. **Hero**: Rozha One headline with two accent pills — direction: "Your next job isn't in a list. It's around the corner." ("list" struck in ink-soft; "corner" in a peepal pill with 📍). Sub-line, ink CTA "Explore the map", mono stat line "92 COMPANIES · 1,486 OPEN ROLES · UPDATED DAILY" fetched live from `/api/companies/map` (graceful fallback while loading).
3. **Live map teaser**: framed container embedding the real `MapCanvas` (read-only, "Open the map →" overlay) — OR a static screenshot if the embed fights; time-box 45 min.
4. **Logo marquee**: two CSS-animated rows of seeded company names, "Featuring startups from Bengaluru to Chennai". Respects reduced-motion (pauses).
5. **Feature: filters** — "Filter signal from noise" + live `FilterPanel demoMode` filtering a small demo result list.
6. **Feature: company insight** — "Know before you knock" + live `CompanyCard demoMode` (compact Overview content).
7. **Feature: tracker** — "A tracker that remembers so you don't" + live `TrackerBoard demoMode`.
8. **Testimonial wall**: masonry of iMessage-style bubbles (paper-2, reactions, "Read 7:06 AM") — **fictional names/roles, original quotes**.
9. **CTA card**: checklist (curated startups, mapped jobs, founder & funding intel, free) + "Get started".
10. **Footer**: playful P.S. lines (original; one may be Hinglish), GitHub repo link, privacy/terms placeholders.

**demoMode contract (locked)**: `FilterPanel`, `CompanyCard`, `TrackerBoard` accept `demoMode?: boolean` + injected data props; a thin wrapper hook branches demo props vs live RTK Query. Fixtures in `apps/web/src/demo/fixtures.ts`, typed against `@chowk/schema` DTOs. The embedded widgets must actually respond to clicks — "the demo IS the product" is the portfolio centerpiece.

**Meta**: favicon.svg + png fallbacks, OG image 1200×630 (BRAND §8), `<title>` "Chowk — startup jobs on a map", meta description, OG/Twitter tags. Deep links get per-company titles client-side.

---

## 10. Seed data (packages/database/prisma/seed.ts)

Deterministic: seeded PRNG (mulberry32 with fixed seed), zero `Math.random()`. Re-running produces identical data. `pnpm db:seed` = truncate + reseed (guard: refuses when `NODE_ENV=production`).

- **~90 companies**: ~40 recognizable Indian startups as anchors (Razorpay, CRED, Zerodha, Swiggy, Zepto, Groww, Meesho, Postman, Zoho, Freshworks, PhonePe, Cars24, Porter, Jar, Slice, Rapido, Unacademy, Ather, Lenskart, boAt, Dream11, Vedantu, Cult.fit, ShareChat, Paytm, Delhivery, Zomato, Blinkit, Urban Company, PharmEasy, Juspay, Chargebee, BrowserStack, Hasura, Sarvam AI, Krutrim, Zetwerk, Darwinbox, Whatfix, Moneyview) with roughly-accurate city placement + ~50 plausible fictional fill. Public facts, roughly right is fine; README disclaimer: "demo data, not real listings".
- **Coordinates — hardcoded locality table, no random city-centroid jitter** (jitter puts pins in lakes). ~30 real sub-localities with real lat/lng: Bengaluru (Koramangala, HSR, Indiranagar, Whitefield, Bellandur, MG Road), NCR (Cyber City, Golf Course Rd, Udyog Vihar, Noida 62, Okhla), Mumbai (BKC, Lower Parel, Powai, Andheri E), Hyderabad (HITEC City, Gachibowli, Madhapur), Pune (Hinjewadi, Kharadi, Baner, Viman Nagar), Chennai (OMR, Guindy, T Nagar). Offices pick a locality + tiny bounded jitter (±0.004°). ~15 companies get a 2nd/3rd office in another city; 3-4 get a foreign office (SF, Singapore, Dubai, London) so the country facet has >1 value and the globe shows something.
- **Founders**: 2-3 per company (real for anchors — public info; generated for fill), join-row titles.
- **Investors**: pool of ~40 real firms (Peak XV, Accel, Y Combinator, Tiger Global, Blume, Elevation, Lightspeed India, Z47, Nexus, 3one4, SoftBank, Prosus, General Catalyst…), 2-5 per funded company — reuse aggressively so investor facet counts are meaningful.
- **Funding**: ~10% bootstrapped, 15% seed/pre-seed, 40% A-C, 25% D+, 10% public-ish; totalFunding/valuation plausible per stage.
- **Jobs ~1500**: 15 departments: Engineering (~40%), Product, Design, Data, AI/ML, Sales, Marketing, Customer Success, Operations, Finance, People, Legal, Support, QA, DevOps. Titles from per-department template pools with seniority prefixes; workMode ~60/25/15 onsite/hybrid/remote; INR bands by seniority (8-15L entry → 90L+ lead at funded cos); ~70% get a plausible external `applyUrl`, ~30% simple-apply only; postedAt spread over past 90 days; ~8% CLOSED (proves status filtering); hiringStatus ~85% actively hiring.
- **Users**: `admin@chowk.dev` / `demo@chowk.dev` (password `Password123!`, documented in README dev section).

**Seed acceptance (script-asserted, not eyeballed)**: every facet dimension ≥2 buckets with count>0; every department ≥1 open job; 5 sampled offices fall inside their city's bbox; counts within targets; reseed → identical counts.

---

## 11. Environment & config

`.env.example` (root; server reads via @fastify/env schema — fail fast on missing):

```bash
DATABASE_URL=postgresql://chowk:chowk@localhost:5432/chowk
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me-64-chars
COOKIE_SECRET=change-me-64-chars
GOOGLE_CLIENT_ID=            # optional in dev; google routes return a clear 503 if unset
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
RESUME_STORAGE_DIR=./uploads
NODE_ENV=development
```

docker-compose: `postgres:16-alpine`, db/user/password `chowk`, port 5432, named volume, healthcheck.

---

## 12. Build phases (ordered; each independently verifiable — do not start a phase before the previous one's Done passes)

| Phase | Scope | Done when |
|---|---|---|
| 0. Scaffold | Turborepo + pnpm workspaces, biome, tsconfigs, docker-compose, CI skeleton, Vite app boots, Tailwind v4 + shadcn init, fonts installed, BRAND tokens in `@theme`, favicon | `pnpm install && pnpm build` green; **canary: one page shows a themed shadcn Button + Rozha One heading + the favicon** (catches Tailwind-v4/shadcn/font drift immediately) |
| 1. Schema | Prisma schema above, `migrate dev`, packages/schema contracts | migration applies; `@chowk/schema` builds; typecheck green |
| 2. Seed ⚠️ | §10 in full | seed acceptance script passes |
| 3. Server core | plugins, envelope, error handler, password auth, companies/jobs read routes | curl: register→login→me round-trip; /api/companies returns seeded data in envelope |
| 3b. Google OAuth ⚠️ | @fastify/oauth2 flow | browser round-trip works; **cuttable after a 30-min fight — document as fast-follow** |
| 4. Server rest | map, facets (+compileFilters), search, applications, resumes+storage, submit, admin | facet-sum assertion script passes; upload writes file + row; save/apply round-trip via curl |
| 5. Map FE ⚠️ | MapCanvas, clustering, popup, FilterPanel+facets, sidebar, URL state, TopBar | clusters render; filter toggle updates URL + markers + counts; sidebar opens with map NOT remounting (center/zoom preserved); deep-link `/map?companySlug=…` opens sidebar |
| 6. App FE | auth pages, ⌘K, save/apply optimistic, tracker, resumes, simple-apply | full journey: register → filter → open company → save job → upload resume → simple-apply → tracker shows APPLIED |
| 7. Landing + admin | §9 landing, submit-company form, admin queue, greeting/locate/music, OG/meta | landing demo widgets interactive; submit→PENDING→approve→appears on map+facets; OG image + favicon in place |
| 8. Ship | Vitest suite (§13), CI green, README (screenshots, mermaid arch diagram, decision log, quickstart, brand section), demo GIF | `pnpm validate` green locally and in CI on a clean clone |

Riskiest: **2** (bad seed silently ruins every demo), **5** (MapLibre lifecycle), **3b** (env config time sink — the only cuttable phase).

## 13. Tests (Vitest; no E2E — manual per-phase verification instead)

1. `compileFilters` — dimensions compose with AND/OR semantics; `omit` excludes exactly its dimension; visibility base always present (highest-value test in the repo)
2. Facets integration (test DB): Σ(bucket counts per dimension) reconciles with filtered totals; selecting a value doesn't zero siblings
3. `/api/companies/map` filter correctness: empty-filter full set; PENDING/deleted companies never appear; a job-level filter hides offices with zero matching jobs and recomputes `openJobCount`
4. argon2 hash/verify round-trip + wrong-password rejection
5. JWT sign/verify: expiry rejected, tamper rejected, claims round-trip
6. Application upsert: save idempotent; save→apply keeps one row, sets appliedAt once; unique (userId,jobId) holds
7. LocalDiskStorageAdapter put/get/delete round-trip in a scratch dir
8. MapSearchParams: single query value coerces to array; invalid enum rejected
9. `useClusterLayer` GeoJSON transform: valid FeatureCollection, correct properties (pure fn, no WebGL)
10. OAuth state mismatch rejected (pure state-check helper)
11. BigInt serializer: Company DTO with 9-figure funding survives JSON.stringify
12. (stretch) seed determinism: two runs → identical row counts

Explicitly skipped: MapLibre visual tests (no WebGL in jsdom), snapshots, E2E, RTK Query cache internals.

## 14. Pitfalls (read before coding the related area)

1. **MapLibre × React**: map instance created once; imperative `setData`/`flyTo` in keyed effects; popups via `createRoot` + `setDOMContent` + unmount on close. Recreating the map on render leaks WebGL contexts (browser caps ~8-16) → blank map.
2. **Viewport in query keys**: forbidden. Cache churn + refetch-on-pan. Filters only.
3. **Facet self-filtering**: counts computed with own dimension omitted, all 7 queries in `Promise.all` (sequential = 7× latency).
4. **OAuth redirect_uri_mismatch**: one canonical URI string, registered verbatim, never retyped by hand. Time-box 30 min.
5. **Tailwind v4 + shadcn drift**: v4 is CSS-first (`@theme`), no JS config — use current `npx shadcn@latest init` against the v4 setup; verify the themed canary page before building 20 components.
6. **Prisma BigInt × JSON**: `JSON.stringify(bigint)` throws. Convert to `number` at the serializer boundary; never return raw Prisma company rows.
7. **Repeated query params**: Fastify needs ajv `coerceTypes:'array'`; FE serializes via `filtersToSearchParams` (repeat params) while TanStack Router URL serialization stays default — decoupled by design, don't unify them.
8. **Cookie/CORS in dev**: Vite proxy `/api`→3000 = same origin, no CORS, cookies just work. Don't add cross-origin config you don't need.

## 15. Code quality bar (this repo goes on a resume — this section is enforceable)

- **Simplicity first.** The explainability test from the header applies to every module. No clever abstractions, no premature generics, no config knobs with one caller. Extract a helper only at the second real consumer.
- **Comments in short, simple English.** Explain *why*, in words a junior dev reads without a dictionary: `// Facet counts skip their own filter so checking "Remote" doesn't zero out the other options.` Never narrate the obvious (`// increment i`). Every non-obvious decision gets one plain sentence at the site.
- TypeScript strict everywhere; no `any` without an inline one-line justification.
- Biome clean; `pnpm validate` (lint+typecheck+test) green before every commit; conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Envelope on every response; visibility scoping via shared helpers only; RTK Query cache never mirrored into local state.
- Small commits per phase; README with architecture diagram (mermaid), screenshots, demo GIF, decision log (no-PostGIS, client clustering, facet omit logic, single Application model, no-bbox map endpoint), quickstart (`docker compose up -d && pnpm i && pnpm db:migrate && pnpm db:seed && pnpm dev`), brand section (mark + palette strip), MIT license, demo credentials.

## 16. Acceptance (the demo script that must work end-to-end)

1. `docker compose up -d && pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` → landing on :5173 with favicon + fonts + brand tokens visibly applied
2. Landing: hero → interact with all three embedded demo widgets → Get started
3. Register (password) → land on `/map` → greeting overlay fades
4. Map shows India-wide clusters → zoom into Bengaluru → clusters split → click marker → popup scales in → View company → sidebar (map untouched behind)
5. Filter: Design + Remote → markers, stats pill, facet counts all update; URL reflects filters; reload → state restored
6. ⌘K → "razor" → open company from results
7. Save two jobs → counter bumps instantly (optimistic) → upload resume → simple-apply with cover note → tracker shows Saved + Applied correctly
8. Submit a company (2 offices) → admin login → approve → new marker on map, facets updated
9. Music toggle plays lofi; locate-me flies to the user (or graceful toast on denial); every async surface shows skeleton/empty/error states correctly
10. `pnpm validate` green; CI green; README screenshots + GIF present

## 17. V2 backlog (documented in README, not built)

Job alerts (schema + email delivery worker), refresh-token rotation, LinkedIn OAuth, dark mode (token swap), PostGIS radius/commute search, pg_trgm search, server clustering past 10k offices, resume parsing/JD match, company claiming/verified badges, public SSR company pages, saved-filter sharing, admin analytics.

## 18. Resolved defaults (flag to the owner only if they object)

- Name **Chowk**; repo dir `chowk`; package scope `@chowk/*`; cookie `chowk_session`
- Google OAuth needs the owner's Google Cloud OAuth client (env vars); until provided, google routes return a clear 503 and password auth carries the demo
- Music: any CC0/royalty-free lofi loop under `/public/audio/` with attribution in README
- All landing copy and testimonials are original and fictional — nothing copied verbatim from nextdoor.company; seeded company facts are public information with a README disclaimer
