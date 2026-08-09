import { Button } from "@/components/ui/button";

/*
  Phase-0 canary. It exists to prove Tailwind v4 tokens, the three self-hosted
  fonts, shadcn theming, and the favicon all load together before we build
  twenty components on top of them. The landing page replaces it in phase 7.
*/

const SWATCHES = [
  { name: "paper", className: "bg-paper" },
  { name: "paper-2", className: "bg-paper-2" },
  { name: "line", className: "bg-line" },
  { name: "stone", className: "bg-stone" },
  { name: "ink-soft", className: "bg-ink-soft" },
  { name: "ink", className: "bg-ink" },
  { name: "peepal-400", className: "bg-peepal-400" },
  { name: "peepal-500", className: "bg-peepal-500" },
  { name: "peepal-600", className: "bg-peepal-600" },
  { name: "peepal-700", className: "bg-peepal-700" },
  { name: "peepal-tint", className: "bg-peepal-tint" },
  { name: "marigold-400", className: "bg-marigold-400" },
  { name: "marigold-500", className: "bg-marigold-500" },
  { name: "marigold-tint", className: "bg-marigold-tint" },
  { name: "danger", className: "bg-danger" },
];

export function App() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center gap-3">
        <img src="/favicon.svg" alt="Chowk logo" className="size-9 rounded-sm" />
        <span className="font-display text-2xl leading-none">
          chowk<span className="text-marigold-500">.</span>
        </span>
      </header>

      <h1 className="font-display mt-10 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05]">
        Every city has a chowk.
        <br />
        Yours is full of jobs.
      </h1>

      <p className="mt-5 max-w-xl text-base text-ink-soft">
        Phase 0 canary. If the heading is Rozha One, the buttons are ink on paper, and the swatches
        below match the brand guide, the design system is wired correctly.
      </p>

      <p className="font-mono mt-6 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        92 companies · 1,486 open roles · 12.97°N 77.59°E
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button>Explore the map</Button>
        <Button variant="secondary">Add company</Button>
        <Button variant="outline">Save job</Button>
        <a
          href="https://github.com"
          className="text-sm font-medium text-peepal-700 underline-offset-4 hover:underline"
        >
          A peepal-700 link
        </a>
      </div>

      <div className="mt-10 flex items-center gap-2 rounded-md border border-line bg-paper-2 px-3 py-2 w-fit">
        <span className="size-2 rounded-full bg-peepal-700" />
        <span className="text-xs font-medium text-peepal-700">Actively hiring</span>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">Palette</h2>
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <li key={swatch.name}>
              <div
                className={`h-12 rounded-sm border border-line ${swatch.className}`}
                // The swatch is decorative; the label underneath carries the name.
                aria-hidden="true"
              />
              <span className="font-mono mt-1.5 block text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                {swatch.name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 rounded-lg border border-line bg-paper-2 p-5 shadow-card">
        <p className="text-sm text-ink-soft">
          Shadows, radii, and the paper-2 raised surface all come from tokens too. This card uses
          <span className="font-mono text-[11px]"> shadow-card</span> and
          <span className="font-mono text-[11px]"> radius-lg</span>.
        </p>
      </div>
    </main>
  );
}
