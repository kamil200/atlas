import type { OfficeMapPoint } from "@chowk/schema";
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MAP_COLORS, MAP_INITIAL_VIEW, MAP_STYLE_URL } from "@/lib/constants";
import { MarkerPopup } from "./MarkerPopup";
import { type OfficeFeatureProperties, toOfficeCollection } from "./use-cluster-layer";

import "maplibre-gl/dist/maplibre-gl.css";

const SOURCE_ID = "offices";
const CLUSTER_LAYER = "clusters";
const CLUSTER_COUNT_LAYER = "cluster-count";
const SELECTED_LAYER = "office-selected";
const POINT_LAYER = "office-point";

export type MapApi = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  getCenterZoom: () => { lng: number; lat: number; zoom: number };
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
  const hoveredRef = useRef<string | number | null>(null);

  const geojson = useMemo(() => toOfficeCollection(offices), [offices]);

  /*
    Latest props kept in refs. The setup effect runs once, so anything its
    event handlers close over directly would be frozen at first render.
  */
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

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: MAP_INITIAL_VIEW.center,
      zoom: MAP_INITIAL_VIEW.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const closePopup = () => {
      popupRootRef.current?.unmount();
      popupRootRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
    };

    map.on("load", () => {
      loadedRef.current = true;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
        // Gives points a stable id so hover can use feature state.
        promoteId: "officeId",
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_COLORS.cluster,
          "circle-opacity": 0.92,
          // Bigger clusters read as bigger bubbles.
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28, 40, 34],
          "circle-stroke-width": 3,
          "circle-stroke-color": MAP_COLORS.stroke,
          "circle-stroke-opacity": 0.9,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
        },
        paint: { "text-color": MAP_COLORS.clusterText },
      });

      // Drawn beneath the pin so it reads as a ring around it.
      map.addLayer({
        id: SELECTED_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "companySlug"], "__none__"],
        paint: { "circle-color": MAP_COLORS.selected, "circle-radius": 11 },
      });

      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case", ["get", "hiring"], MAP_COLORS.hiring, MAP_COLORS.quiet],
          "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 8.5, 7],
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_COLORS.stroke,
        },
      });

      // Data and selection may both have arrived before the style finished.
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(geojsonRef.current);
      applySelected(map, selectedRef.current);
    });

    // --- interaction ----------------------------------------------------
    map.on("click", CLUSTER_LAYER, (event) => {
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

    map.on("click", POINT_LAYER, (event) => {
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
        offset: 14,
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
      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hover: false });
      }
      hoveredRef.current = feature?.id ?? null;
      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredRef.current }, { hover: true });
      }
    };

    for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
      map.on("mouseenter", layer, (event) => {
        map.getCanvas().style.cursor = "pointer";
        if (layer === POINT_LAYER) setHover(event.features?.[0]);
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
        if (layer === POINT_LAYER) setHover(undefined);
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

    onReadyRef.current?.({
      flyTo: (lat, lng, zoom = 12) => map.flyTo({ center: [lng, lat], zoom, duration: 800 }),
      getCenterZoom: () => ({ ...map.getCenter(), zoom: map.getZoom() }),
    });

    return () => {
      resizeObserver.disconnect();
      closePopup();
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Empty on purpose: the map is built once and updated by the effects below.
  }, []);

  // --- push new data without touching the camera -----------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(geojson);
  }, [geojson]);

  // --- ring the open company -------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    applySelected(map, selectedCompanySlug);
  }, [selectedCompanySlug]);

  return <div ref={containerRef} className="size-full" data-testid="map-canvas" />;
}

function applySelected(map: maplibregl.Map, slug: string | undefined) {
  if (!map.getLayer(SELECTED_LAYER)) return;
  map.setFilter(SELECTED_LAYER, [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "companySlug"], slug ?? "__none__"],
  ]);
}
