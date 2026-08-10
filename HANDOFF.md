# Builder handoff — prompts for the build chat

Open Claude Code in `/Users/kp/Personal/atlas/` and paste these prompts in order. One prompt per chat is fine — the PRD is self-contained, so every chat re-reads it. Rules that keep the build on rails:

- If the builder proposes changing anything marked **locked**, reply: "follow the PRD".
- Never let it skip a phase's done-criteria. "Show me the output" is in every prompt for a reason.
- Paste real error output back into the chat; don't paraphrase it.
- Google OAuth (phase 3b) only when your `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are in `.env` — otherwise it stays skipped, password auth carries the demo.

---

## Prompt 1 — Foundation (phases 0–2)

```
Read PRD.md, CLAUDE.md, and brand/BRAND.md fully before writing any code. This project is built strictly phase by phase from PRD §12.

Build phases 0, 1, and 2 in order: scaffold, schema + shared contracts, seed. Do not start a phase until the previous phase's done-criteria pass. Commit per phase with conventional commits.

Stop after phase 2 and show me: the phase-0 canary (themed shadcn button + Rozha One heading + favicon), `pnpm validate` output, and the seed acceptance script output (facet buckets, department coverage, office bbox checks, row counts).
```

## Prompt 2 — Backend core (phases 3–4)

```
Read PRD.md and CLAUDE.md first. Phases 0-2 are done — verify `pnpm validate` is green and the DB is seeded before you start.

Build phase 3 (plugins, envelope, password auth, companies/jobs read routes) and then phase 4 (map endpoint, facets with compileFilters, search, applications, resumes + storage, submit, admin). Skip phase 3b (Google OAuth) unless GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env — check first and tell me which path you took.

Remember: no path parameters anywhere (PRD §7 identity convention), envelope on every response, all filter endpoints go through compileFilters.

Stop after phase 4 and show me: a curl round-trip of register → login → me, one filtered /api/companies/map response, and the facet-sum assertion output.
```

## Prompt 3 — Google OAuth (phase 3b, only when creds exist)

```
Read PRD.md §7 auth flows. My Google OAuth client ID and secret are now in .env, and the redirect URI http://localhost:3000/api/auth/google/callback is registered verbatim in Google Cloud Console.

Build phase 3b. Time-box: if you hit redirect_uri_mismatch or config fights for more than 30 minutes of effort, stop, keep password-only auth, and document OAuth as a fast-follow in the README — the PRD explicitly allows this.

Show me the browser round-trip working (or the documented cut).
```

## Prompt 4 — Map experience (phase 5, the risky one)

```
Read PRD.md §8 and §14 (pitfalls 1 and 2) before writing any code — the MapCanvas lifecycle rules are exact, not suggestions: one MapLibre instance created once, imperative setData/flyTo, popups via createRoot + setDOMContent, sidebar driven by companySlug/jobId search params so the map never unmounts, viewport never in an RTK Query arg.

Build phase 5: MapCanvas, clustering, popup, FilterPanel with facet counts, CompanySidebar, URL state, TopBar. Use the brand tokens from brand/BRAND.md — pin/cluster colors, selected marigold ring, legend pill.

Stop when the done-criteria pass and prove the big one to me: open and close the sidebar and show (screenshot or log of map center/zoom) that the map did not remount.
```

## Prompt 5 — App features (phase 6)

```
Read PRD.md §7-8. Build phase 6: auth pages, ⌘K command palette, save/unsave with optimistic updates (onQueryStarted + undo), tracker, resume upload/manage, simple-apply dialog.

Copy voice comes from brand/BRAND.md §6 — use those lines verbatim where they fit. Every async surface needs loading, empty, and error states (PRD §8).

Stop when the full journey works and walk me through it: register → filter → open company → save job → upload resume → simple-apply → tracker shows APPLIED.
```

## Prompt 6 — Landing, admin, ship (phases 7–8)

```
Read PRD.md §9 and §12-13. Build phase 7 (landing page with the three demoMode component embeds, submit-company form + my-submissions list, admin queue, greeting/locate/music polish, OG image + meta) and phase 8 (the Vitest suite from §13, CI green, README with screenshots + mermaid architecture diagram + decision log + quickstart + brand section, demo GIF).

The landing embeds must be the real components in demoMode, interactive, typed against @atlas/schema fixtures — not screenshots.

Finish with `pnpm validate` output, the CI run, and the acceptance script from PRD §16 walked end to end.
```
