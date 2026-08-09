import { type Static, Type } from "@sinclair/typebox";

export const FacetBucket = Type.Object({
  value: Type.String(),
  label: Type.String(),
  count: Type.Integer(),
});
export type FacetBucket = Static<typeof FacetBucket>;

/*
  Seven dimensions, each counted with its own filter left out so ticking
  "Remote" doesn't zero out the other work modes.
*/
export const FacetsResponse = Type.Object({
  hiringStatus: Type.Array(FacetBucket),
  workMode: Type.Array(FacetBucket),
  country: Type.Array(FacetBucket),
  city: Type.Array(FacetBucket),
  department: Type.Array(FacetBucket),
  fundingStage: Type.Array(FacetBucket),
  investors: Type.Array(FacetBucket),
});
export type FacetsResponse = Static<typeof FacetsResponse>;

/* The keys compileFilters can be asked to omit, named once. */
export const FACET_DIMENSIONS = [
  "hiringStatus",
  "workMode",
  "country",
  "city",
  "department",
  "fundingStage",
  "investors",
] as const;
export type FacetDimension = (typeof FACET_DIMENSIONS)[number];
