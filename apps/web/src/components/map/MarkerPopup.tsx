import { ArrowRight, Building2 } from "lucide-react";
import type { OfficeFeatureProperties } from "./use-cluster-layer";

/*
  Rendered into a detached node and handed to MapLibre. It gets plain
  callbacks rather than router hooks, because this lives in its own React root
  and has no providers above it.
*/
export function MarkerPopup({
  office,
  onViewCompany,
}: {
  office: OfficeFeatureProperties;
  onViewCompany: () => void;
}) {
  return (
    <div className="w-60 font-sans">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-line bg-paper-2 text-ink-soft">
          {office.logoUrl ? (
            <img src={office.logoUrl} alt="" className="size-full rounded-sm object-cover" />
          ) : (
            <Building2 className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{office.companyName}</p>
          {office.hiring ? (
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-peepal-700" />
              <span className="text-xs font-medium text-peepal-700">Actively hiring</span>
            </span>
          ) : (
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-stone" />
              <span className="text-xs font-medium text-ink-soft">Quiet right now</span>
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-ink">
        {office.openJobCount === 0
          ? "No open roles"
          : `${office.openJobCount} open ${office.openJobCount === 1 ? "role" : "roles"}`}
        {office.isHq ? <span className="text-ink-soft"> · head office</span> : null}
      </p>

      {/*
        Two things worth knowing before you click through: whether this is a
        real hiring push rather than one stray vacancy, and whether anything
        landed recently. Both are computed server-side from the same roles.
      */}
      {office.isHot || office.newJobCount > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {office.isHot ? (
            <span className="rounded-full bg-peepal-tint px-2 py-0.5 text-[11px] font-medium text-peepal-700">
              Hiring across several teams
            </span>
          ) : null}
          {office.newJobCount > 0 ? (
            <span className="rounded-full bg-marigold-tint px-2 py-0.5 text-[11px] font-medium text-[#6F5600]">
              {office.newJobCount} posted this week
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="font-mono mt-1 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
        {formatCoordinates(office.lat, office.lng)}
      </p>

      <button
        type="button"
        onClick={onViewCompany}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-sm bg-ink px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
      >
        View company
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* The mono coordinate line is the signature detail (BRAND §3). */
export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lng).toFixed(2)}°${ew}`;
}
