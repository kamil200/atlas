import type { StyleSpecification } from "maplibre-gl";
import { MAP_STYLE_URL } from "./constants";

/*
  Positron is a good quiet basemap, but it is cold grey and Chowk lives on warm
  paper. So we fetch the style once and repaint it in brand colours before the
  map is built.

  Why not a CSS filter over the canvas: the pins are drawn on the same canvas,
  so a filter would tint them too. Repainting the style leaves the pins alone.
*/

/* Basemap greys, warmed toward paper. Derived from BRAND §2, not new brand colours. */
const GROUND = "#f6f1e7";
const GROUND_SOFT = "#f1eadc";
const SNOW = "#fcfaf6";
const PARK = "#e6eedf";
const WOOD = "#e1ebd8";
const WATER = "#cbdce2";
const WATER_EDGE = "#bcd0d8";
const BUILDING = "#ede6d8";
const BUILDING_EDGE = "#e3daca";
const ROAD = "#fffdf8";
const ROAD_QUIET = "#fbf8f2";
const ROAD_CASING = "#e7decd";
const ROAD_CASING_STRONG = "#e2d6c1";
const RAIL = "#e4dbca";
const RAIL_DASH = "#f7f3ea";
const BORDER = "#c9bfac";
const LABEL = "#4a4237";
const LABEL_STRONG = "#2f2921";
const LABEL_QUIET = "#8b8172";
const LABEL_WATER = "#7794a0";
const HALO = "#faf7f0";

/*
  Keyed by the layer ids Positron ships. An id we do not know about keeps its
  original paint, so a style update can only ever leave a layer un-warmed —
  it can never crash the map.
*/
const PAINT: Record<string, Record<string, string>> = {
  background: { "background-color": GROUND },
  park: { "fill-color": PARK },
  landcover_wood: { "fill-color": WOOD },
  landuse_residential: { "fill-color": GROUND_SOFT },
  landcover_ice_shelf: { "fill-color": SNOW },
  landcover_glacier: { "fill-color": SNOW },
  water: { "fill-color": WATER },
  waterway: { "line-color": WATER_EDGE },
  building: { "fill-color": BUILDING, "fill-outline-color": BUILDING_EDGE },
  "aeroway-area": { "fill-color": GROUND_SOFT },
  "aeroway-runway": { "line-color": ROAD },
  "aeroway-runway-casing": { "line-color": ROAD_CASING },
  "aeroway-taxiway": { "line-color": ROAD_CASING },
  road_area_pier: { "fill-color": GROUND },
  road_pier: { "line-color": GROUND },
  highway_path: { "line-color": ROAD_QUIET },
  highway_minor: { "line-color": ROAD_QUIET },
  highway_major_casing: { "line-color": ROAD_CASING },
  highway_major_inner: { "line-color": ROAD },
  highway_major_subtle: { "line-color": ROAD_CASING },
  highway_motorway_casing: { "line-color": ROAD_CASING_STRONG },
  highway_motorway_inner: { "line-color": ROAD },
  highway_motorway_subtle: { "line-color": ROAD_CASING },
  highway_motorway_bridge_casing: { "line-color": ROAD_CASING_STRONG },
  highway_motorway_bridge_inner: { "line-color": ROAD },
  tunnel_motorway_casing: { "line-color": ROAD_CASING },
  tunnel_motorway_inner: { "line-color": ROAD_QUIET },
  railway: { "line-color": RAIL },
  railway_dashline: { "line-color": RAIL_DASH },
  railway_service: { "line-color": RAIL },
  railway_service_dashline: { "line-color": RAIL_DASH },
  railway_transit: { "line-color": RAIL },
  railway_transit_dashline: { "line-color": RAIL_DASH },
  boundary_2: { "line-color": BORDER },
  boundary_3: { "line-color": BORDER },
  boundary_disputed: { "line-color": BORDER },
  waterway_line_label: { "text-color": LABEL_WATER, "text-halo-color": HALO },
  water_name_point_label: { "text-color": LABEL_WATER, "text-halo-color": HALO },
  water_name_line_label: { "text-color": LABEL_WATER, "text-halo-color": HALO },
  "highway-name-path": { "text-color": LABEL_QUIET, "text-halo-color": HALO },
  "highway-name-minor": { "text-color": LABEL_QUIET, "text-halo-color": HALO },
  "highway-name-major": { "text-color": LABEL_QUIET, "text-halo-color": HALO },
  airport: { "text-color": LABEL_QUIET, "text-halo-color": HALO },
  label_other: { "text-color": LABEL, "text-halo-color": HALO },
  label_village: { "text-color": LABEL, "text-halo-color": HALO },
  label_town: { "text-color": LABEL, "text-halo-color": HALO },
  label_state: { "text-color": LABEL_QUIET, "text-halo-color": HALO },
  label_city: { "text-color": LABEL_STRONG, "text-halo-color": HALO },
  label_city_capital: { "text-color": LABEL_STRONG, "text-halo-color": HALO },
  label_country_1: { "text-color": LABEL_STRONG, "text-halo-color": HALO },
  label_country_2: { "text-color": LABEL_STRONG, "text-halo-color": HALO },
  label_country_3: { "text-color": LABEL, "text-halo-color": HALO },
};

/*
  Started at import time so the fetch overlaps React's first render — by the
  time the map effect runs the style is usually already here.
*/
let pending: Promise<StyleSpecification | string> | null = null;

export function loadBrandStyle(): Promise<StyleSpecification | string> {
  pending ??= fetch(MAP_STYLE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`style ${response.status}`);
      return response.json() as Promise<StyleSpecification>;
    })
    .then(warmStyle)
    // Falling back to the plain URL means a bad network gives a grey map, not no map.
    .catch(() => MAP_STYLE_URL);
  return pending;
}

function warmStyle(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    const overrides = PAINT[layer.id];
    if (!overrides) continue;
    // Layers with no paint block of their own still need one to receive colours.
    const paint = { ...(("paint" in layer && layer.paint) || {}) };
    Object.assign(paint, overrides);
    (layer as { paint?: unknown }).paint = paint;
  }
  return style;
}
