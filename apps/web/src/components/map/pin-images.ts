import type { OfficeMapPoint } from "@chowk/schema";
import type maplibregl from "maplibre-gl";
import { MAP_COLORS } from "@/lib/constants";
import {
  drawCompanyTile,
  drawCountChip,
  drawHerePin,
  drawLabelPill,
  drawStateRing,
  loadLogo,
} from "./pin-sprites";

/*
  Owns every picture the map draws with.

  Two rules make this safe. Images are always registered before the data that
  uses them, so a symbol is never laid out against a missing icon. And a
  company's tile is drawn once and kept, so changing a filter re-uses the
  pictures already on the GPU instead of redrawing ninety canvases.
*/

export const IMAGE = {
  ringHiring: "chowk-ring-hiring",
  ringQuiet: "chowk-ring-quiet",
  ringSelected: "chowk-ring-selected",
  ringHover: "chowk-ring-hover",
  labelPill: "chowk-label-pill",
  countChip: "chowk-count-chip",
  herePin: "chowk-here-pin",
} as const;

/* Also built inside a MapLibre expression, so the prefix has to live in one place. */
export const TILE_PREFIX = "chowk-tile-";
export const tileImageId = (slug: string) => `${TILE_PREFIX}${slug}`;

/* Which companies this map already has a tile for. Cleared with the map itself. */
const drawnTiles = new WeakMap<maplibregl.Map, Set<string>>();

export function registerSharedImages(map: maplibregl.Map) {
  const ratio = spriteRatio();

  add(map, IMAGE.ringHiring, drawStateRing(MAP_COLORS.hiring, MAP_COLORS.hiringGlow, ratio), ratio);
  add(map, IMAGE.ringQuiet, drawStateRing(MAP_COLORS.quiet, null, ratio), ratio);
  add(
    map,
    IMAGE.ringSelected,
    drawStateRing(MAP_COLORS.selected, MAP_COLORS.selectedGlow, ratio),
    ratio,
  );
  add(map, IMAGE.ringHover, drawStateRing(MAP_COLORS.hover, null, ratio), ratio);
  add(map, IMAGE.herePin, drawHerePin(ratio), ratio);

  const pill = drawLabelPill(ratio);
  map.addImage(IMAGE.labelPill, pill.data, pill.options);
  const chip = drawCountChip(ratio);
  map.addImage(IMAGE.countChip, chip.data, chip.options);
}

/*
  Draws a tile for every company on the map that does not have one yet.
  Logos are fetched in parallel; a company with no logo, or a logo that fails
  to load, falls back to its initials without blocking anyone else.
*/
export async function syncCompanyTiles(map: maplibregl.Map, offices: readonly OfficeMapPoint[]) {
  let drawn = drawnTiles.get(map);
  if (!drawn) {
    drawn = new Set();
    drawnTiles.set(map, drawn);
  }

  const wanted = new Map<string, OfficeMapPoint>();
  for (const office of offices) {
    if (!drawn.has(office.companySlug)) wanted.set(office.companySlug, office);
  }
  if (wanted.size === 0) return;

  const ratio = spriteRatio();
  // Text in a tile is drawn with Inter, so wait for it rather than draw fallback glyphs.
  await document.fonts.ready;

  await Promise.all(
    [...wanted.values()].map(async (office) => {
      const logo = office.logoUrl ? await loadLogo(office.logoUrl) : null;
      // A second sync may have finished this company while its logo was in flight.
      if (drawn.has(office.companySlug)) return;
      const tile = drawCompanyTile(office.companyName, office.companySlug, logo, ratio);
      add(map, tileImageId(office.companySlug), tile, ratio);
      drawn.add(office.companySlug);
    }),
  );
}

/*
  Sprites are drawn at the screen's pixel density, capped at 2. A 3x phone
  gains nothing visible from a third of a megabyte more texture per pin.
*/
function spriteRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/* addImage throws if the id is taken, and a hot reload can run this twice. */
function add(map: maplibregl.Map, id: string, data: ImageData, pixelRatio: number) {
  if (map.hasImage(id)) map.removeImage(id);
  map.addImage(id, data, { pixelRatio });
}
