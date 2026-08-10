import type { OfficeMapPoint } from "@chowk/schema";
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  MAP_CITY_ZOOM,
  MAP_CLUSTER_MAX_ZOOM,
  MAP_COLORS,
  MAP_INITIAL_VIEW,
  MAP_STYLE_URL,
} from "@/lib/constants";
import { applyBrandPaint } from "@/lib/map-style";
import { MarkerPopup } from "./MarkerPopup";
import { IMAGE, registerSharedImages, syncCompanyTiles, TILE_PREFIX } from "./pin-images";
import { type OfficeFeatureProperties, toOfficeCollection } from "./use-cluster-layer";

import "maplibre-gl/dist/maplibre-gl.css";

const SOURCE_ID = "offices";
const HERE_SOURCE_ID = "you-are-here";

const LAYER = {
  ring: "office-ring",
  hover: "office-hover",
  selected: "office-selected",
  tile: "office-tile",
  label: "office-label",
  cluster: "office-cluster",
  here: "office-here",
} as const;

const NO_FEATURE = "__none__";

export type MapApi = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  getCenterZoom: () => { lng: number; lat: number; zoom: number };
  zoomBy: (delta: number) => void;
  resetView: () => void;
  /** Drops the marigold "you are here" dot and flies to it. */
  showHere: (lat: number, lng: number) => void;
};

type MapCanvasProps = {
  offices: readonly OfficeMapPoint[];
  selectedCompanySlug?: string;
  onSelectCompany: (slug: string) => void;
  onReady?: (api: MapApi) => void;
  /** Read-only mode for the landing page teaser: pins do not open popups. */
  interactive?: boolean;
};

/*
  The one component that owns a MapLibre instance.

  The rules here are not style preferences. A WebGL context is expensive and
  browsers only allow about eight to sixteen at a time, so the map is created
  once in an effect with no dependencies and updated imperatively after that.
  Recreating it on render leaks contexts until the map goes blank.

  It is also why the sidebar lives in a search param rather than a nested
  route: nothing above this component may unmount it while you browse.
*/
export function MapCanvas({
  offices,
  selectedCompanySlug,
  onSelectCompany,
  onReady,
  interactive = true,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);

  /*
    Guards for the two ways an async tile draw can land at the wrong moment:
    after a newer push has already written, or after the map is gone.
  */
  const pushIdRef = useRef(0);
  const removedRef = useRef(false);

  const geojson = useMemo(() => toOfficeCollection(offices), [offices]);

  /*
    Latest props kept in refs. The setup effect runs once, so anything its
    event handlers close over directly would be frozen at first render.
  */
  const officesRef = useRef(offices);
  officesRef.current = offices;
  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;
  const onSelectRef = useRef(onSelectCompany);
  onSelectRef.current = onSelectCompany;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const selectedRef = useRef(selectedCompanySlug);
  selectedRef.current = selectedCompanySlug;

  // --- create the map exactly once -------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // StrictMode mounts, tears down, and mounts again — this map is live once more.
    removedRef.current = false;

    const closePopup = () => {
      popupRootRef.current?.unmount();
      popupRootRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
    };

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: MAP_INITIAL_VIEW.center,
      zoom: MAP_INITIAL_VIEW.zoom,
      attributionControl: { compact: true },
      maxZoom: 17,
      // Symbols fade rather than pop when a tile finishes loading.
      fadeDuration: 200,
    });
    mapRef.current = map;

    /*
      Set up on `styledata`, not on `load`.

      MapLibre only fires `load` after the first complete frame is painted, and
      a browser stops painting a background tab. Opening the map in a new tab
      and switching to it later would leave a map with no pins on it. `styledata`
      fires when the stylesheet itself is ready, whether or not anything drew.
    */
    const setUpLayers = () => {
      if (map.getSource(SOURCE_ID)) return;

      /*
        addSource is the first call that needs a parsed stylesheet, and it
        throws until there is one. Letting it throw here is the check: nothing
        after it has run, and the next styledata event tries again.

        Not isStyleLoaded() — that also waits on every tile in view, which a
        background tab never fetches.
      */
      try {
        addSourcesAndLayers(map);
      } catch {
        return;
      }

      /*
        The globe is why zooming out is fun. MapLibre flattens it to mercator
        on its own as you zoom into a city, so nothing else has to know which
        projection is showing.

        No sky on purpose: MapLibre's fog blends toward the horizon across the
        whole globe, and any fog colour near paper turns the map into a blank
        sheet. The globe reads fine without it.
      */
      map.setProjection({ type: "globe" });
      applyBrandPaint(map);
      registerSharedImages(map);
      loadedRef.current = true;

      // Data and selection may both have arrived before the style finished.
      pushIdRef.current += 1;
      const pushId = pushIdRef.current;
      pushData(map, geojsonRef.current, officesRef.current, () => {
        return !removedRef.current && pushIdRef.current === pushId;
      }).catch((error) => {
        if (import.meta.env.DEV) console.error("Map data push failed", error);
      });
      applyFilter(map, LAYER.selected, "companySlug", selectedRef.current);
    };

    map.on("styledata", setUpLayers);
    setUpLayers();

    // --- interaction ----------------------------------------------------
    map.on("click", LAYER.cluster, (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId === undefined) return;

      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(clusterId).then((zoom) => {
        if (feature?.geometry.type !== "Point") return;
        map.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: 500,
        });
      });
    });

    map.on("click", LAYER.tile, (event) => {
      if (!interactiveRef.current) return;
      const feature = event.features?.[0];
      if (feature?.geometry.type !== "Point") return;

      closePopup();

      const office = feature.properties as unknown as OfficeFeatureProperties;

      /*
        React renders into a detached node that MapLibre owns. The root is
        unmounted when the popup closes — leaving it mounted would leak a
        React tree for every pin the user ever clicked.
      */
      const node = document.createElement("div");
      const root = createRoot(node);
      root.render(
        <MarkerPopup
          office={office}
          onViewCompany={() => {
            onSelectRef.current(office.companySlug);
            closePopup();
          }}
        />,
      );
      popupRootRef.current = root;

      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        offset: 26,
        maxWidth: "none",
        className: "chowk-popup",
      })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(node)
        .addTo(map);

      popupRef.current.on("close", () => {
        popupRootRef.current?.unmount();
        popupRootRef.current = null;
      });
    });

    const setHover = (feature: MapGeoJSONFeature | undefined) => {
      const officeId = feature?.properties?.officeId as string | undefined;
      applyFilter(map, LAYER.hover, "officeId", officeId);
    };

    for (const layer of [LAYER.cluster, LAYER.tile] as const) {
      map.on("mouseenter", layer, (event) => {
        map.getCanvas().style.cursor = "pointer";
        if (layer === LAYER.tile) setHover(event.features?.[0]);
      });
      map.on("mousemove", layer, (event) => {
        if (layer === LAYER.tile) setHover(event.features?.[0]);
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
        if (layer === LAYER.tile) setHover(undefined);
      });
    }

    /*
      MapLibre measures its container once, at construction, and keeps that
      size forever. It needs telling when the box changes — which happens on
      the first layout pass and again every time the filter panel collapses.
    */
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    /*
      A handle for poking at the map from the console in development —
      map.getZoom(), queryRenderedFeatures, and so on. Never in a build.
    */
    if (import.meta.env.DEV) {
      (window as unknown as { __chowkMap?: maplibregl.Map }).__chowkMap = map;
    }

    onReadyRef.current?.(buildApi(map));

    return () => {
      resizeObserver.disconnect();
      closePopup();
      loadedRef.current = false;
      // Set before remove(), so anything still awaiting knows not to touch the map.
      removedRef.current = true;
      map.remove();
      mapRef.current = null;
    };
    // Empty on purpose: the map is built once and updated by the effects below.
  }, []);

  // --- push new data without touching the camera -----------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    // Only the newest push is allowed to write, and only while the map lives.
    pushIdRef.current += 1;
    const pushId = pushIdRef.current;
    const isCurrent = () => !removedRef.current && pushIdRef.current === pushId;

    pushData(map, geojson, offices, isCurrent).catch((error) => {
      if (import.meta.env.DEV) console.error("Map data push failed", error);
    });
  }, [geojson, offices]);

  // --- ring the open company -------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    applyFilter(map, LAYER.selected, "companySlug", selectedCompanySlug);
  }, [selectedCompanySlug]);

  return <div ref={containerRef} className="size-full" data-testid="map-canvas" />;
}

/*
  Tiles have to exist on the GPU before the symbols that name them are laid
  out, so the draw always happens first and setData always happens second.
*/
async function pushData(
  map: maplibregl.Map,
  geojson: ReturnType<typeof toOfficeCollection>,
  offices: readonly OfficeMapPoint[],
  isCurrent: () => boolean,
) {
  await syncCompanyTiles(map, offices, isCurrent);

  /*
    Drawing tiles waits on fonts and on a logo per company, so two pushes
    started close together can finish in either order. Without this check the
    slower one wins and the map ends up showing a filter nobody selected —
    every pin back on screen while the panel and the URL both say Design.
  */
  if (!isCurrent()) return;

  const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  source.setData(geojson);
}

function addSourcesAndLayers(map: maplibregl.Map) {
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 46,
    clusterMaxZoom: MAP_CLUSTER_MAX_ZOOM,
    // Gives points a stable id so hover and selection can address one office.
    promoteId: "officeId",
  });

  map.addSource(HERE_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  const single: maplibregl.FilterSpecification = ["!", ["has", "point_count"]];
  const clustered: maplibregl.FilterSpecification = ["has", "point_count"];

  /*
    Rings, tiles and labels are three layers over one source. The two ring
    layers and the tile layer all ignore collision, so they can never disagree
    about which pins are on screen. Only the name plates collide — which is
    the whole point, and the one thing the reference product gets wrong.
  */
  map.addLayer({
    id: LAYER.ring,
    type: "symbol",
    source: SOURCE_ID,
    filter: single,
    layout: {
      "icon-image": ["case", ["get", "hiring"], IMAGE.ringHiring, IMAGE.ringQuiet],
      ...PINNED,
    },
  });

  map.addLayer({
    id: LAYER.hover,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["get", "officeId"], NO_FEATURE],
    layout: { "icon-image": IMAGE.ringHover, ...PINNED },
  });

  map.addLayer({
    id: LAYER.selected,
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["get", "companySlug"], NO_FEATURE],
    layout: { "icon-image": IMAGE.ringSelected, ...PINNED },
  });

  map.addLayer({
    id: LAYER.tile,
    type: "symbol",
    source: SOURCE_ID,
    filter: single,
    layout: {
      "icon-image": ["concat", TILE_PREFIX, ["get", "companySlug"]],
      ...PINNED,
    },
    paint: {
      // Companies that are not hiring step back without disappearing.
      "icon-opacity": ["case", ["get", "hiring"], 1, 0.72],
    },
  });

  map.addLayer({
    id: LAYER.label,
    type: "symbol",
    source: SOURCE_ID,
    filter: single,
    layout: {
      // Width only: the plate keeps its height and grows sideways with the name.
      "icon-image": IMAGE.labelPill,
      "icon-text-fit": "width",
      "icon-text-fit-padding": [0, 3, 0, 3],
      "text-field": ["get", "companyName"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 11,
      "text-anchor": "top",
      "text-offset": [0, 1.9],
      // High enough that a name never wraps out of a fixed-height plate.
      "text-max-width": 30,
      // Plates may sit close together; they just may not overlap.
      "text-padding": 1,
      // When two plates fight for the same spot, the company hiring more people wins.
      "symbol-sort-key": ["-", 0, ["get", "openJobCount"]],
    },
    paint: {
      "text-color": MAP_COLORS.label,
      "icon-opacity": ["case", ["get", "hiring"], 1, 0.85],
    },
  });

  map.addLayer({
    id: LAYER.cluster,
    type: "symbol",
    source: SOURCE_ID,
    filter: clustered,
    layout: {
      "icon-image": IMAGE.countChip,
      "icon-text-fit": "width",
      "icon-text-fit-padding": [0, 4, 0, 4],
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 13,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": MAP_COLORS.clusterText },
  });

  map.addLayer({
    id: LAYER.here,
    type: "symbol",
    source: HERE_SOURCE_ID,
    layout: { "icon-image": IMAGE.herePin, ...PINNED },
  });
}

/* Pins never hide each other. Only their name plates compete for space. */
const PINNED = {
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "icon-anchor": "center",
} as const;

function applyFilter(
  map: maplibregl.Map,
  layer: string,
  property: string,
  value: string | undefined,
) {
  if (!map.getLayer(layer)) return;
  map.setFilter(layer, [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", property], value ?? NO_FEATURE],
  ]);
}

function buildApi(map: maplibregl.Map): MapApi {
  return {
    flyTo: (lat, lng, zoom = 12) => map.flyTo({ center: [lng, lat], zoom, duration: 800 }),
    getCenterZoom: () => ({ ...map.getCenter(), zoom: map.getZoom() }),
    zoomBy: (delta) => map.easeTo({ zoom: map.getZoom() + delta, duration: 250 }),
    resetView: () =>
      map.flyTo({
        center: MAP_INITIAL_VIEW.center,
        zoom: MAP_INITIAL_VIEW.zoom,
        bearing: 0,
        pitch: 0,
        duration: 900,
      }),
    showHere: (lat, lng) => {
      const source = map.getSource(HERE_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } },
        ],
      });
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), MAP_CITY_ZOOM),
        duration: 900,
      });
    },
  };
}
