import { Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { MAP_CITY_ZOOM } from "@/lib/constants";
import type { MapApi } from "./MapCanvas";
import { MusicToggle } from "./MusicToggle";

/* Bottom-centre ink pill. Tabular numerals keep it from twitching as counts change. */
export function StatsPill({
  companies,
  openJobs,
  isLoading,
}: {
  companies: number;
  openJobs: number;
  isLoading: boolean;
}) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
      <p className="font-mono rounded-full bg-ink px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-paper shadow-pop">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Counting
          </span>
        ) : (
          `${companies.toLocaleString("en-IN")} companies · ${openJobs.toLocaleString("en-IN")} open roles`
        )}
      </p>
    </div>
  );
}

/* Top-left key so the two pin colours mean something. */
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

export function MapControls({ mapApi }: { mapApi: React.RefObject<MapApi | null> }) {
  const locate = () => {
    if (!navigator.geolocation) {
      toast("Your browser will not share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        mapApi.current?.flyTo(position.coords.latitude, position.coords.longitude, MAP_CITY_ZOOM),
      () => toast("No location this time. Pan the map instead."),
      { timeout: 8000 },
    );
  };

  const zoom = (direction: 1 | -1) => {
    const current = mapApi.current?.getCenterZoom();
    if (!current) return;
    mapApi.current?.flyTo(current.lat, current.lng, current.zoom + direction);
  };

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <div className="flex flex-col overflow-hidden rounded-md border border-line bg-paper shadow-card">
        <ControlButton label="Zoom in" onClick={() => zoom(1)}>
          <Plus className="size-4" aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" />
        <ControlButton label="Zoom out" onClick={() => zoom(-1)}>
          <Minus className="size-4" aria-hidden="true" />
        </ControlButton>
      </div>
      <div className="overflow-hidden rounded-md border border-line bg-paper shadow-card">
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
      onClick={onClick}
      className="grid size-9 place-items-center text-ink transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-peepal-500"
    >
      {children}
    </button>
  );
}
