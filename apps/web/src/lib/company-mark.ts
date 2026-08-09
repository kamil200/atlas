/*
  Every company needs something to show on a pin. Most seeded companies have no
  logo file, so we draw their initials on a colour picked from their slug —
  same slug, same colour, every reload and every device.

  This is not decoration for its own sake: a map of identical dots reads as a
  chart, a map of distinct marks reads as a place.
*/

/* Ten marks that hold their own against warm paper without fighting peepal green. */
const MARK_COLORS = [
  "#2f5d8c",
  "#1b7f4d",
  "#8c3b2f",
  "#5a3d8c",
  "#0f6d75",
  "#8c5a1b",
  "#a03a5f",
  "#37634a",
  "#4a4f8c",
  "#7a4a2b",
] as const;

export function markColor(seed: string): string {
  return MARK_COLORS[hash(seed) % MARK_COLORS.length];
}

/*
  One letter for a single word, two for a name with several — "CRED" reads as
  C, "Tata 1mg" as T1. Longer than two initials stops being legible at 34px.
*/
export function markInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/* FNV-1a. Small, fast, and stable across runtimes — which is the only thing we need. */
function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
