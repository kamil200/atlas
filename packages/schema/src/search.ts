import { type Static, Type } from "@sinclair/typebox";
import { Nullable } from "./common";

export const SearchQuery = Type.Object({
  q: Type.String({ minLength: 2, maxLength: 100 }),
});
export type SearchQuery = Static<typeof SearchQuery>;

export const SearchCompanyHit = Type.Object({
  slug: Type.String(),
  name: Type.String(),
  logoUrl: Nullable(Type.String()),
});
export type SearchCompanyHit = Static<typeof SearchCompanyHit>;

export const SearchJobHit = Type.Object({
  id: Type.String(),
  title: Type.String(),
  companySlug: Type.String(),
  companyName: Type.String(),
});
export type SearchJobHit = Static<typeof SearchJobHit>;

export const SearchLocationHit = Type.Object({
  city: Type.String(),
  country: Type.String(),
  companyCount: Type.Integer(),
});
export type SearchLocationHit = Static<typeof SearchLocationHit>;

export const SearchResponse = Type.Object({
  companies: Type.Array(SearchCompanyHit),
  jobs: Type.Array(SearchJobHit),
  locations: Type.Array(SearchLocationHit),
});
export type SearchResponse = Static<typeof SearchResponse>;

export const SEARCH_GROUP_LIMIT = 7;
