# Mockup prompts

Paste any of these into claude.ai (artifacts on) or Claude Code to generate mockup variations. Each is self-contained — tokens included — so outputs stay on-brand. Generate 2-3 variations of each, pick the best, screenshot for the README.

---

## Prompt 1 — Landing page mockup

```
Build a single-file HTML mockup (inline CSS only, no external assets, no JS needed) of a landing page for "Atlas" — a job platform that puts startups hiring on an interactive city map instead of a list. India-first, playful but professional, polish level of a designer-built product.

Brand tokens (use exactly):
- paper #FFFFFF (page bg), paper-2 #F2F3F6 (wells + hover fills), ink #191A1C (text + primary buttons with paper text), ink-soft #6E7078, line #E3E5E9 (borders)
- peepal green #1B7F4D (brand, map pins/clusters, hero pill, checked states), peepal deep #136640 (links, badges), marigold #F5B301 (tiny dot accents + selected ring only), stone #B0B3BA (quiet/not-hiring pins)
- Tints: #E2F1E6 (green pill fill), #DEF0E4 (applied chip), #FCF1CE (interviewing chip)
- Display font: Young Serif (fallback Georgia). Body: Inter (fallback system-ui). Mono garnish: JetBrains Mono (fallback ui-monospace) for tiny uppercase meta labels like "92 COMPANIES · 1,486 JOBS"
- Radius 12-24px, warm soft shadows, generous whitespace

Logo mark (inline SVG): peepal-green rounded square #1B7F4D containing four paper rounded squares in a 2x2 grid (city blocks) with a marigold center dot — a map tile with a crossroads. Wordmark "atlas" lowercase in the display font with a marigold full stop.

Sections:
1. Nav: logo, "Add company", "Login" (ink button)
2. Hero: "Your next job isn't in a list." then "It's around the corner." with "list" struck through and "corner" in a green pill with a map-pin glyph; sub-line; ink CTA "Explore the map"; mono stat line under it
3. A framed map teaser: stylized abstract street map drawn with CSS/SVG (paper bg, line-colored streets, one soft park blob, one soft lake blob), 3 peepal cluster bubbles with counts (74, 22, 40), one open popup card showing a company (logo dot, name, "Actively hiring" badge in deep green, "14 open roles", ink button)
4. Three feature cards: "Filter signal from noise" (mini filter panel with checkboxes and mono counts, checked = green), "Know before you knock" (mini company card: funding stage, investors chips, founders), "A tracker that remembers" (mini saved/applied rows with tinted status chips)
5. Testimonial wall: 4 chat-style bubbles (paper-2, rounded, "Read 7:06 AM" receipts), fictional Indian names/roles
6. CTA card + footer with a playful P.S. line

Desktop width ~1200px. No lorem — write real copy in a warm, plain voice.
```

## Prompt 2 — Dashboard (/map) mockup

```
Build a single-file HTML mockup (inline CSS + minimal JS optional) of the map dashboard for "Atlas" — startups on a city map. This is the product screen; polish it like a designer-built app (think nextdoor.company quality).

[Include the same "Brand tokens" and "Logo mark" blocks from Prompt 1]

Layout (desktop 1440px, full-bleed):
- Top bar (64px, paper, bottom line border): logo mark + wordmark; center search input styled as a button "Search companies, jobs, places… ⌘K"; right: "Saved 5" and "Applied 2" counter chips (counts in deep green mono), avatar circle
- Left filter panel (300px, paper, right line border, scrollable): "Filters" header with "Clear all" link in deep green; accordion groups — Hiring status, Work mode, City, Department, Funding stage, Investors; each row = checkbox + label + dotted leader + mono count (e.g. "Bengaluru ······ 141"); 2-3 boxes checked in peepal green; one marigold dot on the active group label
- Map area (rest): abstract Bengaluru street map hand-drawn with SVG — paper ground, thin line streets, a soft park blob labeled "CUBBON PARK", a soft lake blob labeled "ULSOOR LAKE" (tiny mono labels); peepal cluster bubbles (74, 21, 22) sized by count with paper text and a soft halo; several individual peepal pins with white strokes; two stone-colored quiet pins; ONE selected pin with a 3px marigold ring and an open popup card (logo dot, "Zepto", green hiring badge, "14 open roles · Bellandur", mono coords "12.93°N 77.68°E", ink button "View company"); a small paper legend pill top-left: green dot "Hiring", stone dot "Quiet"
- Right sidebar (380px, paper, shadow, over the map): company detail for the selected company — logo tile in peepal, name, tagline, hiring badge; mono coords line; tabs Overview/Offices/Jobs with Jobs active (green underline); 3 job rows (title, mono meta "Design · Bengaluru · Hybrid", bookmark icon — one filled in deep green); ink "Simple apply" button on the first row
- Bottom center floating stats pill: ink bg, paper mono text "92 COMPANIES · 1,486 OPEN ROLES"
- Bottom right: zoom +/- buttons and a locate-me button (paper, line border)

Details that sell it: soft shadows, 12-16px radii, hover states, tabular numbers, marigold used exactly twice (selected ring + group dot).
```

## Prompt 3 — Logo explorations

```
Generate 6 SVG logo mark explorations for "Atlas" (Hindi: town square/crossroads) — a map-based startup-jobs platform. Constraints: must read at 16px, flat vector, max 3 colors from: peepal green #1B7F4D, paper #FFFFFF, ink #191A1C, marigold #F5B301. Directions to explore: (1) map tile with four city blocks + center dot, (2) crossroads/plus formed by negative space, (3) location pin whose head is a town square, (4) aerial roundabout with a tree canopy center, (5) rangoli-geometric square, (6) the Devanagari च simplified into a map path. Present all 6 on one white board with the wordmark "atlas" in Young Serif below each.
```
