import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { CompanySidebar } from "@/components/company/CompanySidebar";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { GreetingOverlay } from "@/components/map/GreetingOverlay";
import { type MapApi, MapCanvas } from "@/components/map/MapCanvas";
import {
  CityJumper,
  MapControls,
  MapLegend,
  MapStatsBar,
  MusicPill,
} from "@/components/map/MapOverlays";
import { summariseOffices } from "@/components/map/use-cluster-layer";
import { useMapFilters } from "@/hooks/use-map-filters";
import { validateMapSearch } from "@/lib/map-search";
import { useGetCompaniesMapQuery, useGetFacetsQuery } from "@/store/api/discovery-api";

export const Route = createFileRoute("/map")({
  component: MapPage,
  validateSearch: validateMapSearch,
});

function MapPage() {
  const { search, apiFilters, activeCount, toggle, clearAll, openCompany, openJob } =
    useMapFilters();

  /*
    Both queries key on the filter dimensions only. The viewport is deliberately
    absent — clustering already happened in the browser, so panning and zooming
    never touch the network.
  */
  const mapQuery = useGetCompaniesMapQuery(apiFilters);
  const facetsQuery = useGetFacetsQuery(apiFilters);

  const mapApi = useRef<MapApi | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const offices = useMemo(() => mapQuery.data?.offices ?? [], [mapQuery.data]);
  const stats = useMemo(() => summariseOffices(offices), [offices]);
  const isEmpty = !mapQuery.isLoading && offices.length === 0;

  /*
    The map is the page, edge to edge. Filters float above it instead of
    squeezing it into a column, so the thing you came to look at never gets
    smaller — and the map never unmounts when the panel opens.
  */
  return (
    <div className="relative h-full">
      <MapCanvas
        offices={offices}
        selectedCompanySlug={search.companySlug}
        onSelectCompany={(slug) => openCompany(slug)}
        onReady={(api) => {
          mapApi.current = api;
        }}
      />

      <MapLegend />
      <CityJumper mapApi={mapApi} />
      <MapControls mapApi={mapApi} />
      <MusicPill />
      <GreetingOverlay />

      <MapStatsBar
        companies={stats.companies}
        openJobs={stats.openJobs}
        isLoading={mapQuery.isFetching}
        activeCount={activeCount}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />

      {panelOpen ? (
        <aside className="absolute bottom-16 left-4 top-16 z-20 flex w-72 flex-col overflow-hidden rounded-xl border border-line bg-paper shadow-pop">
          <FilterPanel
            facets={facetsQuery.data}
            isLoading={facetsQuery.isLoading}
            selected={search}
            activeCount={activeCount}
            onToggle={toggle}
            onClearAll={clearAll}
          />
        </aside>
      ) : null}

      {isEmpty ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto max-w-xs rounded-lg border border-line bg-paper p-5 text-center shadow-pop">
            <p className="text-sm text-ink">
              No startups match these filters. Loosen one and try again.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : null}

      {mapQuery.isError ? (
        <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-md border border-line bg-paper px-4 py-2.5 shadow-pop">
            <p className="text-sm text-ink">Couldn't load the map.</p>
            <button
              type="button"
              onClick={() => mapQuery.refetch()}
              className="text-sm font-medium text-peepal-700 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <CompanySidebar
        companySlug={search.companySlug}
        jobId={search.jobId}
        onClose={() => openCompany(undefined)}
        onOpenJob={openJob}
        onFlyTo={(lat, lng) => mapApi.current?.flyTo(lat, lng)}
      />
    </div>
  );
}
