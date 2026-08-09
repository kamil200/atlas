/*
  The map-tile mark: four blocks around a crossroads, marigold dot at the centre.
  Hexes are literal here on purpose — the same artwork ships as favicon.svg and
  the OG image, so it cannot depend on the app's CSS tokens being loaded.
  Values track BRAND §2: peepal-600 tile, paper blocks, marigold-500 dot.
*/
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Chowk">
      <title>Chowk</title>
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#1B7F4D" />
      <rect x="9" y="9" width="19" height="19" rx="6" fill="#FFFFFF" />
      <rect x="36" y="9" width="19" height="19" rx="6" fill="#FFFFFF" />
      <rect x="9" y="36" width="19" height="19" rx="6" fill="#FFFFFF" />
      <rect x="36" y="36" width="19" height="19" rx="6" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="4.5" fill="#F5B301" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {/*
        Young Serif sets wider and heavier than the face this replaced, so the
        wordmark sits a step down in size with the tracking pulled in. The
        translate nudges the baseline back up — the font's descender space
        makes it read low next to the mark otherwise.
      */}
      <span className="font-display translate-y-px text-[1.0625rem] leading-none tracking-[-0.01em] text-ink">
        chowk<span className="text-marigold-500">.</span>
      </span>
    </span>
  );
}
