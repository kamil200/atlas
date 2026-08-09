import type { StyleSpecification } from "maplibre-gl";
import { MAP_STYLE_URL } from "./constants";

/*
  Positron is a good quiet basemap, but its greys lean slightly blue and Chowk's
  chrome is a neutral white. So we fetch the style once and repaint it in brand
  colours before the map is built.

  Why not a CSS filter over the canvas: the pins are drawn on the same canvas,
  so a filter would tint them too. Repainting the style leaves the pins alone.
*/

/* Basemap greys, neutralised to match the paper chrome. Derived from BRAND §2, not new brand colours. */
const GROUND = "#f2f3f6";
const GROUND_SOFT = "#eceef2";
const SNOW = "#fafbfc";
const PARK = "#e6efe9";
const WOOD = "#dfeae3";
const WATER = "#d3e0e8";
const WATER_EDGE = "#c2d3dd";
const BUILDING = "#e8eaee";
const BUILDING_EDGE = "#dde0e6";
const ROAD = "#ffffff";
const ROAD_QUIET = "#fafbfc";
const ROAD_CASING = "#e3e5e9";
const ROAD_CASING_STRONG = "#d7dae0";
const RAIL = "#dfe2e7";
const RAIL_DASH = "#f4f5f7";
const BORDER = "#bcc0c8";
const LABEL = "#4a4d55";
const LABEL_STRONG = "#26282c";
const LABEL_QUIET = "#868a93";
const LABEL_WATER = "#7d94a3";
const HALO = "#ffffff";

/*
  Keyed by the layer ids Positron ships. An id we do not know about keeps its
  original paint, so a style update can only ever leave a layer un-repainted —
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
    .then(repaintStyle)
    // Falling back to the plain URL means a bad network gives a grey map, not no map.
    .catch(() => MAP_STYLE_URL);
  return pending;
}

function repaintStyle(style: StyleSpecification): StyleSpecification {
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
