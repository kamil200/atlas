export const APP_NAME = "Chowk";

/* Keyless vector tiles. Positron is light and quiet, and map-style.ts warms it to paper. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/* Roughly the middle of India, zoomed out far enough to see every seeded city. */
export const MAP_INITIAL_VIEW = { center: [78.9, 20.6] as [number, number], zoom: 3.6 };

export const MAP_CITY_ZOOM = 11;

/* Zoom at which clusters break apart into individual company pins. */
export const MAP_CLUSTER_MAX_ZOOM = 11;

/* Brand tokens the map needs as literal values — MapLibre paints on a canvas,
   so it cannot read CSS variables the way the rest of the UI does. */
export const MAP_COLORS = {
  hiring: "#1B7F4D",
  hiringGlow: "rgba(46, 157, 100, 0.55)",
  quiet: "#B8AE9E",
  cluster: "#1B7F4D",
  clusterText: "#FAF7F0",
  selected: "#F5B301",
  selectedGlow: "rgba(245, 179, 1, 0.6)",
  hover: "#FFC933",
  stroke: "#FAF7F0",
  label: "#211E1A",
  labelQuiet: "#6F6659",
};
