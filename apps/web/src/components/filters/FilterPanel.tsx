import type { FacetBucket, FacetsResponse } from "@atlas/schema";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterKey } from "@/lib/map-search";

/*
  Counts come from /api/facets, which computes each dimension with its own
  filter left out. That is why ticking "Remote" leaves the other work modes
  showing real numbers instead of zeroes you can never come back from.
*/

type Dimension = {
  key: FilterKey;
  facet: keyof FacetsResponse;
  label: string;
};

const DIMENSIONS: Dimension[] = [
  { key: "hiringStatus", facet: "hiringStatus", label: "Hiring" },
  { key: "department", facet: "department", label: "Department" },
  { key: "workMode", facet: "workMode", label: "Work mode" },
  { key: "city", facet: "city", label: "City" },
  { key: "country", facet: "country", label: "Country" },
  { key: "fundingStage", facet: "fundingStage", label: "Funding stage" },
  { key: "investorId", facet: "investors", label: "Investors" },
];

/*
  Long lists get a search box and a short preview rather than a hard cut.
  Investors runs to 150 buckets and cities keep growing, and a list that
  silently stopped at twenty was hiding options with no way to reach them.
*/
const SEARCH_FROM = 12;
const COLLAPSED_COUNT = 8;

export type FilterPanelProps = {
  facets?: FacetsResponse;
  isLoading: boolean;
  selected: Partial<Record<FilterKey, string[] | undefined>>;
  activeCount: number;
  onToggle: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  /** Landing page embeds this with fixture data and no live query. */
  demoMode?: boolean;
};

export function FilterPanel({
  facets,
  isLoading,
  selected,
  activeCount,
  onToggle,
  onClearAll,
  demoMode = false,
}: FilterPanelProps) {
  const [queries, setQueries] = useState<Partial<Record<FilterKey, string>>>({});
  const [expanded, setExpanded] = useState<Partial<Record<FilterKey, boolean>>>({});

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
        </span>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-medium text-peepal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
          >
            Clear all
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={demoMode ? ["department"] : ["hiringStatus", "department", "workMode"]}
          className="px-1"
        >
          {DIMENSIONS.map((dimension) => {
            const buckets = facets?.[dimension.facet] ?? [];
            const chosen = selected[dimension.key] ?? [];

            const query = queries[dimension.key] ?? "";
            const isSearchable = buckets.length > SEARCH_FROM;
            const matched = query
              ? buckets.filter((bucket) => bucket.label.toLowerCase().includes(query.toLowerCase()))
              : buckets;

            /*
              Anything already ticked stays on screen even when it sits past the
              preview, or you could check a city, collapse the list, and be left
              with a count chip pointing at nothing you can see.
            */
            const showAll = query.length > 0 || expanded[dimension.key] === true;
            const visible = showAll
              ? matched
              : [
                  ...matched.slice(0, COLLAPSED_COUNT),
                  ...matched
                    .slice(COLLAPSED_COUNT)
                    .filter((bucket) => chosen.includes(bucket.value)),
                ];
            const remaining = matched.length - visible.length;

            return (
              <AccordionItem key={dimension.key} value={dimension.key} className="border-line">
                <AccordionTrigger className="px-3 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    {dimension.label}
                    {chosen.length > 0 ? (
                      <span className="font-mono rounded-full bg-peepal-tint px-1.5 py-0.5 text-[10px] text-peepal-700">
                        {chosen.length}
                      </span>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {isSearchable ? (
                    <Input
                      value={query}
                      onChange={(event) =>
                        setQueries((current) => ({
                          ...current,
                          [dimension.key]: event.target.value,
                        }))
                      }
                      placeholder={`Search ${dimension.label.toLowerCase()}`}
                      aria-label={`Search ${dimension.label.toLowerCase()}`}
                      className="mb-2 h-8 text-sm"
                    />
                  ) : null}

                  {isLoading && buckets.length === 0 ? (
                    <FilterSkeleton />
                  ) : visible.length === 0 ? (
                    <p className="py-2 text-xs text-ink-soft">Nothing here with these filters.</p>
                  ) : (
                    <>
                      <ul className="space-y-0.5">
                        {visible.map((bucket) => (
                          <FilterRow
                            key={bucket.value}
                            dimensionKey={dimension.key}
                            bucket={bucket}
                            checked={chosen.includes(bucket.value)}
                            onToggle={() => onToggle(dimension.key, bucket.value)}
                          />
                        ))}
                      </ul>

                      {remaining > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => ({ ...current, [dimension.key]: true }))
                          }
                          className="mt-1.5 px-1 text-xs font-medium text-peepal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
                        >
                          Show {remaining} more
                        </button>
                      ) : null}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

function FilterRow({
  dimensionKey,
  bucket,
  checked,
  onToggle,
}: {
  dimensionKey: string;
  bucket: FacetBucket;
  checked: boolean;
  onToggle: () => void;
}) {
  // Zero-count options stay visible but disabled, so the list never jumps around.
  const disabled = bucket.count === 0 && !checked;

  /*
    The dimension has to be in the id. Singapore is both a city and a country,
    so two rows shared the id "facet-Singapore" — and a label points at whichever
    element the document finds first, which meant clicking Country: Singapore
    ticked City: Singapore instead.
  */
  const id = `facet-${dimensionKey}-${bucket.value}`;

  return (
    <li>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 rounded-sm px-1 py-1.5 ${
          disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-paper-2"
        }`}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:border-peepal-600 data-[state=checked]:bg-peepal-600"
        />
        <span className={`truncate text-sm ${checked ? "font-semibold text-ink" : "text-ink"}`}>
          {bucket.label}
        </span>
        {/* The dotted leader is what makes a filter list read like an index. */}
        <span
          className="mx-1 min-w-3 flex-1 border-b border-dotted border-line"
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] text-ink-soft">
          {bucket.count.toLocaleString("en-IN")}
        </span>
      </label>
    </li>
  );
}

function FilterSkeleton() {
  return (
    <ul className="space-y-2 py-1">
      {[0, 1, 2, 3].map((row) => (
        <li key={row} className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-6" />
        </li>
      ))}
    </ul>
  );
}
