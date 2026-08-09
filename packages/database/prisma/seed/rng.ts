/*
  A seeded random number generator. Every value in the seed comes from here so
  two runs produce the same database — Math.random() would make the demo shift
  under us and make bugs impossible to reproduce.
*/

const SEED = 0x63686f77; // "chow" in hex, so the constant is at least memorable

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both ends included. */
  int(min: number, max: number): number;
  /** True with the given probability, e.g. chance(0.85). */
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** `count` distinct items, or all of them when the list is shorter. */
  pickSome<T>(items: readonly T[], count: number): T[];
  /** Picks by relative weight, e.g. weighted([["ONSITE", 60], ["REMOTE", 15]]). */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  /** Offset in [-span, +span], used to spread offices around a locality. */
  jitter(span: number): number;
};

export function createRng(seed: number = SEED): Rng {
  const next = mulberry32(seed);

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Cannot pick from an empty list");
    return items[Math.floor(next() * items.length)];
  }

  function pickSome<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const taken: T[] = [];
    const wanted = Math.min(count, pool.length);
    for (let i = 0; i < wanted; i += 1) {
      taken.push(...pool.splice(Math.floor(next() * pool.length), 1));
    }
    return taken;
  }

  function weighted<T>(entries: readonly (readonly [T, number])[]): T {
    if (entries.length === 0) throw new Error("Cannot pick from an empty weight list");
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    // Only reachable through floating point drift on the last entry.
    return entries[entries.length - 1][0];
  }

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (probability) => next() < probability,
    pick,
    pickSome,
    weighted,
    jitter: (span) => (next() * 2 - 1) * span,
  };
}
