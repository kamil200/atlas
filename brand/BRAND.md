# Chowk — Brand Guide

**Chowk** (चौक) — the town square. The crossroads where the whole city shows up: vendors, chai, gossip, opportunity. Chowk puts every startup hiring in your city on one map, so finding your next job feels like walking your own neighborhood, not grinding through a list.

One-line pitch: **"Every city has a chowk. Yours is full of jobs."**

The palette is green-led (owner's call): **peepal green** — the tree at the center of every Indian square — and **marigold** — the garland strung across it. One green, one yellow, ink for buttons. The whole system in a sentence.

Name usage: "Chowk" capitalized in prose; the wordmark is lowercase `chowk` with a marigold full stop. Pronunciation note for the README: rhymes with "cloak" (chauk).

---

## 1. Logo

Files in `brand/`: `logo.svg` (lockup), `logo-mark.svg` (tile only), `favicon.svg`.

The mark is a **map tile**: four paper city blocks around a crossroads on a peepal-green tile, with a marigold dot at the center — the chowk itself, the point where everything meets. It reads at 16px (favicon) and scales up clean.

Rules: don't rotate, recolor, outline, or shadow the mark. Clear space = half the tile width on all sides. On dark or photographic grounds use the tile mark alone (it carries its own background). Minimum lockup width 96px; below that, use the mark only.

The marigold dot is a reusable motif: wordmark full stop, selected-state ring, map "you are here", bullet accents. Use it sparingly — one dot per view.

## 2. Color

Neutral white ground, ink for text and primary CTAs, and a **green-led system**.

The ground used to be warm cream (`#FAF7F0`). It was swapped for true white in Aug 2026 — on screen the cream read as dated newsprint rather than warm, and it dulled every surface sitting on it. Depth now comes from a hairline plus a tight shadow, not from a tinted ground. Link contrast improved as a side effect (6.6:1 → 7.0:1). The token *names* are unchanged, so nothing downstream had to move.

- **Peepal (green)** — the brand color and the working color. The logo tile, map pins, clusters, links, focus rings, selected filters, active bookmark, tabs, hiring badges. If it's Chowk or you can act on it, it's peepal.
- **Marigold (yellow)** — the garland. The dot, the selected-pin ring, small highlights and celebratory moments. Never large surfaces, never text.
- **Ink** — body text and primary buttons (paper text on ink, reference-style).

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FFFFFF` | Page ground, cards, chrome |
| `paper-2` | `#F2F3F6` | Wells, hover fills, skeletons |
| `ink` | `#191A1C` | Text, primary buttons (paper text on ink) |
| `ink-soft` | `#6E7078` | Secondary text, placeholders |
| `line` | `#E3E5E9` | Borders, dividers |
| `peepal-400` | `#55B983` | Hover glows, subtle fills |
| `peepal-500` | `#2E9D64` | Focus rings, active accents |
| `peepal-600` | `#1B7F4D` | Brand tile, pins, clusters, checked states, badges |
| `peepal-700` | `#136640` | Links (AA on paper), pressed states |
| `marigold-400` | `#FFC933` | Glows, hover ring on pins |
| `marigold-500` | `#F5B301` | The dot, selected-pin ring, star moments |
| `danger` | `#D64545` | Errors, destructive actions |
| `stone` | `#B0B3BA` | Quiet (not-hiring) pins, disabled |

Tints for chips/wells (derived, don't invent new ones): peepal tint `#DEF0E4` (applied chips, success wells), marigold tint `#FCF1CE` (interviewing chips), pill tint `#E2F1E6` (hero pill fill).

Contrast rules (AA): body text = ink on paper (17.4:1). Secondary text = ink-soft on paper (5.0:1). Links = peepal-700 (7.0:1). Cluster/badge text = paper on peepal-600 (5.0:1) — 12px+ semibold only. Never marigold for text at any size; never peepal lighter than 600 for text under 18px. Primary CTA = ink background + paper text; peepal is an accent and a map color, not a button fill.

Map pin states: actively hiring = peepal-600 (white stroke); quiet/not hiring = stone; hover = marigold-400 ring; selected = marigold-500 ring, 3px — the garland around the tree. Cluster bubble = peepal-600 fill, paper count text, soft peepal halo behind, size stepped by count.

Dark mode: v1 is light-only (deliberate — matches the reference and halves the polish surface). Tokens are semantic, so a dark theme is a token swap later, not a rewrite.

## 3. Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Young Serif** (Google Fonts) | Landing headlines, section titles, the wordmark, big numbers. Weight 400 only (it ships one). Wide, heavy, tall x-height — so it reads a size larger than most serifs: default tracking `-0.015em` and leading `1.12` are set once on `.font-display`, sizes `clamp(2.3rem, 5.6vw, 4.1rem)` for h1 |
| UI / body | **Inter** | Everything in the product. 400 body, 500 labels, 600 emphasis. 14px base in app, 16px on landing |
| Data garnish | **JetBrains Mono** | Coordinates, counts, meta labels. 11–12px, uppercase, `letter-spacing: 0.08em` — e.g. `12.97°N 77.59°E`, `92 COMPANIES · 1,486 JOBS` |

Self-host via `@fontsource/young-serif`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`. Numbers in tables/counters get `font-variant-numeric: tabular-nums`.

The mono-coordinates garnish is the signature detail: any place a location appears, its coordinates may appear beside it in tiny mono. Use in the stats pill, company sidebar header, office rows.

## 4. Tailwind v4 tokens (drop into `apps/web/src/index.css`)

```css
@import "tailwindcss";

@theme {
  --color-paper: #FFFFFF;
  --color-paper-2: #F2F3F6;
  --color-ink: #191A1C;
  --color-ink-soft: #6E7078;
  --color-line: #E3E5E9;
  --color-peepal-400: #55B983;
  --color-peepal-500: #2E9D64;
  --color-peepal-600: #1B7F4D;
  --color-peepal-700: #136640;
  --color-peepal-tint: #DEF0E4;
  --color-marigold-400: #FFC933;
  --color-marigold-500: #F5B301;
  --color-marigold-tint: #FCF1CE;
  --color-danger: #D64545;
  --color-stone: #B0B3BA;

  --font-display: "Young Serif", Georgia, serif;
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Neutral and tight. On a white ground a wide soft blur just reads as grey
     haze — depth comes from a crisp 1px contact shadow plus a weaker ambient. */
  --shadow-sm: 0 1px 2px rgb(17 18 21 / 0.05);
  --shadow-card: 0 1px 2px rgb(17 18 21 / 0.06), 0 4px 12px -2px rgb(17 18 21 / 0.06);
  --shadow-pop: 0 2px 4px rgb(17 18 21 / 0.06), 0 12px 32px -8px rgb(17 18 21 / 0.14);
}
```

Map shadcn's semantic variables to these (background→paper, foreground→ink, primary→ink, ring→peepal-500, border→line, muted→paper-2, accent→peepal-tint) in the same file.

## 5. Motion

Fast and physical, never floaty. 150ms micro (hover, toggle), 250ms structural (sheet, dialog), map `flyTo` 800ms. Easing `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart). Signature micro-interactions (the "same polish as the reference" bar):

- Bookmark tap: icon pops (scale 1 → 1.25 → 1, 200ms) and the top-bar counter bumps
- Marker popup: scale-in from the pin point, 150ms
- Cluster hover: grows 8%, cursor pointer
- Card hover: `translateY(-2px)` + shadow-card→shadow-pop
- Greeting overlay: fade+rise in, auto-fade after 2.5s
- Filter count change: number crossfades (no layout shift — tabular-nums)

All motion behind `prefers-reduced-motion: no-preference`. No parallax, no scroll-jacking.

## 6. Voice

Plain, warm, specific. Short sentences. Say the number ("1,486 jobs"), not the adjective ("tons of jobs"). Light Hinglish is welcome ONLY in delight moments — greetings, empty states, the footer — one line max, never in errors, data, or forms.

| Moment | Write this | Not this |
|---|---|---|
| Morning greeting | "Bright and early. The chowk is all yours." | "Welcome back to your dashboard!" |
| Empty tracker | "Nothing saved yet. Wander the map — something will catch your eye." | "No data available." |
| Empty filter result | "No startups match these filters. Loosen one and try again." | "0 results found." |
| Apply success toast | "Applied. Fingers crossed." | "Your application has been submitted successfully!" |
| Error | "Couldn't save this job. Check your connection and try again." | "Oops! Something went wrong 😢" |

Buttons say what they do: "Save job", "Apply on company site", "Show 12 roles". No "Submit", no "Learn more".

## 7. Component notes

- **Primary CTA**: ink bg, paper text, radius-md, no border. Hover: lifts 1px, bg lightens 6%
- **Secondary**: paper bg, 1px line border, ink text
- **Hiring badge**: peepal-700 dot + "Actively hiring" 12px medium in peepal-700
- **Filter row**: checkbox, label, dotted leader, mono count right-aligned; checked = peepal-600 box + label 600 weight
- **Status chips (tracker)**: Saved = paper + line border; Applied = peepal-tint + peepal-700 text; Interviewing = marigold-tint + `#8A6D00` text
- **Popup card**: paper bg, line border, radius-lg, shadow-pop, peepal top accent hairline
- **Stats pill**: ink bg, paper text, mono, bottom-center of map, radius-full
- **Map legend**: small paper pill, top-left: peepal dot "Hiring" · stone dot "Quiet"
- **Skeletons**: paper-2 shimmer, match final layout exactly (no spinner walls)

## 8. Assets checklist for the build

- `apps/web/public/favicon.svg` (from brand/), `favicon-32.png`, `apple-touch-icon.png`
- OG image 1200×630: paper ground, peepal tile mark, "chowk" wordmark, tagline, faint map-grid pattern
- `<title>` pattern: "Chowk — startup jobs on a map" (landing), "{Company} · Chowk" (deep links)
- Map style: OpenFreeMap Positron, repainted layer by layer in `apps/web/src/lib/map-style.ts` — its greys lean slightly blue, so they are neutralised to sit against the white chrome. Not a CSS filter: the pins share the canvas and would get tinted too
