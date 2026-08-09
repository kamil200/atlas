import { createFileRoute } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CompanySidebar } from "@/components/company/CompanySidebar";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { GreetingOverlay } from "@/components/map/GreetingOverlay";
import { type MapApi, MapCanvas } from "@/components/map/MapCanvas";
import { MapControls, MapLegend, StatsPill } from "@/components/map/MapOverlays";
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
  const [panelOpen, setPanelOpen] = useState(true);

  const offices = useMemo(() => mapQuery.data?.offices ?? [], [mapQuery.data]);
  const stats = useMemo(() => summariseOffices(offices), [offices]);
  const isEmpty = !mapQuery.isLoading && offices.length === 0;

  return (
    <div className="flex h-full">
      <aside
        className={`relative shrink-0 border-r border-line bg-paper transition-[width] duration-250 ${
          panelOpen ? "w-72" : "w-0"
        }`}
      >
        <div className={panelOpen ? "h-full" : "hidden"}>
          <FilterPanel
            facets={facetsQuery.data}
            isLoading={facetsQuery.isLoading}
            selected={search}
            activeCount={activeCount}
            onToggle={toggle}
            onClearAll={clearAll}
          />
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-label={panelOpen ? "Hide filters" : "Show filters"}
          className="absolute -right-3.5 top-4 z-20 grid size-7 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
        >
          {panelOpen ? (
            <PanelLeftClose className="size-3.5" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </aside>

      <main className="relative min-w-0 flex-1">
        <MapCanvas
          offices={offices}
          selectedCompanySlug={search.companySlug}
          onSelectCompany={(slug) => openCompany(slug)}
          onReady={(api) => {
            mapApi.current = api;
          }}
        />

        <MapLegend />
        <MapControls mapApi={mapApi} />
        <GreetingOverlay />
        <StatsPill
          companies={stats.companies}
          openJobs={stats.openJobs}
          isLoading={mapQuery.isFetching}
        />

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
      </main>

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
