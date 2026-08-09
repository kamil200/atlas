import { FundingStage, HiringStatus, type MapSearchParams, WorkMode } from "@chowk/schema";

/*
  Parses the /map query string into typed filters.

  It is hand-written rather than a schema check because a URL is user-editable:
  a stray or misspelled value should quietly drop out, not throw an error page
  at someone who was only trying to share a link.
*/

function toStringArray(value: unknown): string[] | undefined {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const clean = values.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return clean.length > 0 ? clean : undefined;
}

function toEnumArray<T extends string>(
  value: unknown,
  allowed: Record<string, T>,
): T[] | undefined {
  const valid = new Set<string>(Object.values(allowed));
  const clean = toStringArray(value)?.filter((item): item is T => valid.has(item));
  return clean && clean.length > 0 ? clean : undefined;
}

function toText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function validateMapSearch(search: Record<string, unknown>): MapSearchParams {
  return {
    hiringStatus: toEnumArray(search.hiringStatus, HiringStatus),
    workMode: toEnumArray(search.workMode, WorkMode),
    fundingStage: toEnumArray(search.fundingStage, FundingStage),
    country: toStringArray(search.country),
    city: toStringArray(search.city),
    department: toStringArray(search.department),
    investorId: toStringArray(search.investorId),
    q: toText(search.q),
    companySlug: toText(search.companySlug),
    jobId: toText(search.jobId),
  };
}

/* The dimensions the filter panel can toggle. */
export const FILTER_KEYS = [
  "hiringStatus",
  "workMode",
  "country",
  "city",
  "department",
  "fundingStage",
  "investorId",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export function countActiveFilters(search: MapSearchParams): number {
  return FILTER_KEYS.reduce((total, key) => total + (search[key]?.length ?? 0), 0);
}
