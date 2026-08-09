import { type Static, Type } from "@sinclair/typebox";
import { StringEnum } from "./common";
import { FundingStage, HiringStatus, WorkMode } from "./enums";

/*
  The filter dimensions. Repeating a param ORs within a dimension; different
  params AND across dimensions. Shared by /companies, /companies/map, /facets
  and /jobs so the query shape can never drift between them.
*/
export const FilterParams = Type.Object({
  hiringStatus: Type.Optional(Type.Array(StringEnum(HiringStatus))),
  workMode: Type.Optional(Type.Array(StringEnum(WorkMode))),
  country: Type.Optional(Type.Array(Type.String())),
  city: Type.Optional(Type.Array(Type.String())),
  department: Type.Optional(Type.Array(Type.String())), // department slugs
  fundingStage: Type.Optional(Type.Array(StringEnum(FundingStage))),
  investorId: Type.Optional(Type.Array(Type.String())),
  q: Type.Optional(Type.String()),
});
export type FilterParams = Static<typeof FilterParams>;

/*
  What lives in the /map URL: the filters above plus which panel is open.
  companySlug and jobId are UI state — they never reach the API.
*/
export const MapSearchParams = Type.Composite([
  FilterParams,
  Type.Object({
    companySlug: Type.Optional(Type.String()),
    jobId: Type.Optional(Type.String()),
  }),
]);
export type MapSearchParams = Static<typeof MapSearchParams>;

export const FILTER_ARRAY_KEYS = [
  "hiringStatus",
  "workMode",
  "country",
  "city",
  "department",
  "fundingStage",
  "investorId",
] as const;

export type FilterArrayKey = (typeof FILTER_ARRAY_KEYS)[number];

/*
  Drops the sidebar keys and normalises the rest before the object becomes an
  RTK Query cache key. Sorting and removing empty arrays means picking the same
  two work modes in a different order hits the same cache entry, and opening a
  company never looks like a filter change.
*/
export function toFilterParams(search: MapSearchParams): FilterParams {
  const filters: FilterParams = {};

  for (const key of FILTER_ARRAY_KEYS) {
    const values = search[key];
    if (values && values.length > 0) {
      // The cast keeps each key's own union type; the sort is value-only.
      filters[key] = [...values].sort() as never;
    }
  }

  const q = search.q?.trim();
  if (q) filters.q = q;

  return filters;
}

/*
  Turns filters into a query string with repeated params
  (?workMode=REMOTE&workMode=HYBRID), which is what the API expects.
*/
export function filtersToSearchParams(filters: MapSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  const normalised = toFilterParams(filters);

  for (const key of FILTER_ARRAY_KEYS) {
    for (const value of normalised[key] ?? []) params.append(key, value);
  }
  if (normalised.q) params.set("q", normalised.q);

  return params;
}
