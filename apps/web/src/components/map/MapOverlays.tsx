import { Compass, Loader2, LocateFixed, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MAP_CITY_ZOOM } from "@/lib/constants";
import type { MapApi } from "./MapCanvas";
import { MusicToggle } from "./MusicToggle";

/*
  Everything that floats over the map. It all sits in one visual family — paper
  surface, hairline border, card shadow — so the controls read as a set of tools
  rather than four unrelated widgets dropped on a map.
*/

/* The seeded cities, so you can cross the country without dragging. */
const CITIES = [
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
] as const;

/* Bottom-left row: the filter handle sits right next to what it is filtering. */
export function MapStatsBar({
  companies,
  openJobs,
  isLoading,
  activeCount,
  panelOpen,
  onTogglePanel,
}: {
  companies: number;
  openJobs: number;
  isLoading: boolean;
  activeCount: number;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
      <button
        type="button"
        onClick={onTogglePanel}
        aria-expanded={panelOpen}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500 ${
          panelOpen
            ? "border-ink bg-ink text-paper hover:bg-ink/90"
            : "border-line bg-paper text-ink hover:bg-paper-2"
        }`}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {activeCount > 0 ? (
          <span
            className={`font-mono rounded-full px-1.5 py-0.5 text-[10px] ${
              panelOpen ? "bg-paper text-ink" : "bg-peepal-tint text-peepal-700"
            }`}
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      <p className="font-mono flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 text-[11px] uppercase tracking-[0.08em] text-ink shadow-card">
        {isLoading ? (
          <>
            <Loader2 className="size-3 animate-spin text-ink-soft" aria-hidden="true" />
            Counting
          </>
        ) : (
          <>
            {companies.toLocaleString("en-IN")} companies
            <span className="text-line" aria-hidden="true">
              ·
            </span>
            {openJobs.toLocaleString("en-IN")} open roles
          </>
        )}
      </p>
    </div>
  );
}

/* Top-left key so the two pin states mean something without a click. */
export function MapLegend() {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3 rounded-full border border-line bg-paper/95 px-3 py-1.5 shadow-card backdrop-blur-sm">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-peepal-600" />
        <span className="text-xs font-medium text-ink">Hiring</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-stone" />
        <span className="text-xs font-medium text-ink-soft">Quiet</span>
      </span>
    </div>
  );
}

/* Top-centre city jumps. Seven taps that replace a lot of dragging. */
export function CityJumper({ mapApi }: { mapApi: React.RefObject<MapApi | null> }) {
  return (
    <div className="absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 lg:block">
      <div className="flex items-center gap-0.5 rounded-full border border-line bg-paper/95 p-1.5 shadow-card backdrop-blur-sm">
        {CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            onClick={() => mapApi.current?.flyTo(city.lat, city.lng, MAP_CITY_ZOOM)}
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MapControls({ mapApi }: { mapApi: React.RefObject<MapApi | null> }) {
  const locate = () => {
    if (!navigator.geolocation) {
      toast("Your browser will not share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => mapApi.current?.showHere(position.coords.latitude, position.coords.longitude),
      () => toast("No location this time. Pan the map instead."),
      { timeout: 8000 },
    );
  };

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-card">
        <ControlButton label="Zoom in" onClick={() => mapApi.current?.zoomBy(1)}>
          <Plus className="size-4" aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" />
        <ControlButton label="Zoom out" onClick={() => mapApi.current?.zoomBy(-1)}>
          <Minus className="size-4" aria-hidden="true" />
        </ControlButton>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-card">
        <ControlButton label="Back to the whole map" onClick={() => mapApi.current?.resetView()}>
          <Compass className="size-4" aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" />
        <ControlButton label="Find my location" onClick={locate}>
          <LocateFixed className="size-4" aria-hidden="true" />
        </ControlButton>
      </div>

      <MusicToggle />
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center text-ink transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-peepal-500"
    >
      {children}
    </button>
  );
}
