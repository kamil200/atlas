/* The map-tile mark: four paper blocks around a crossroads, marigold dot at the centre. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Chowk">
      <title>Chowk</title>
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#1B7F4D" />
      <rect x="9" y="9" width="19" height="19" rx="6" fill="#FAF7F0" />
      <rect x="36" y="9" width="19" height="19" rx="6" fill="#FAF7F0" />
      <rect x="9" y="36" width="19" height="19" rx="6" fill="#FAF7F0" />
      <rect x="36" y="36" width="19" height="19" rx="6" fill="#FAF7F0" />
      <circle cx="32" cy="32" r="4.5" fill="#F5B301" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl leading-none text-ink">
        chowk<span className="text-marigold-500">.</span>
      </span>
    </span>
  );
}
