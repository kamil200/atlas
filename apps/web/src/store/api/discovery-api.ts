import {
  type CompaniesListData,
  type CompaniesMapData,
  type CompanyData,
  type DepartmentsListData,
  type FacetsResponse,
  type FilterParams,
  filtersToSearchParams,
  type InvestorsListData,
  type JobData,
  type JobsListData,
  type SearchResponse,
} from "@atlas/schema";
import { baseApi } from "./base-api";

/*
  Everything the map screen reads. Query args are filter dimensions only —
  the viewport never appears here, because pan and zoom are handled entirely
  in the browser and putting bounds in a cache key would refetch on every drag.
*/
function withFilters(path: string, filters: FilterParams, extra?: Record<string, string>) {
  const params = filtersToSearchParams(filters);
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const discoveryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompaniesMap: builder.query<CompaniesMapData, FilterParams>({
      query: (filters) => withFilters("/companies/map", filters),
      providesTags: ["CompanyMap"],
    }),

    getCompanies: builder.query<CompaniesListData, FilterParams & { page?: number }>({
      query: ({ page, ...filters }) =>
        withFilters("/companies", filters, page ? { page: String(page) } : undefined),
      providesTags: ["Company"],
    }),

    getCompanyBySlug: builder.query<CompanyData, string>({
      query: (slug) => `/company?slug=${encodeURIComponent(slug)}`,
      providesTags: (_result, _error, slug) => [{ type: "Company", id: slug }],
    }),

    getFacets: builder.query<FacetsResponse, FilterParams>({
      query: (filters) => withFilters("/facets", filters),
      providesTags: ["Facets"],
    }),

    getJobs: builder.query<JobsListData, FilterParams & { page?: number; sort?: string }>({
      query: ({ page, sort, ...filters }) =>
        withFilters("/jobs", filters, {
          ...(page ? { page: String(page) } : {}),
          ...(sort ? { sort } : {}),
        }),
      providesTags: ["Job"],
    }),

    getJobById: builder.query<JobData, string>({
      query: (id) => `/job?id=${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: "Job", id }],
    }),

    search: builder.query<SearchResponse, string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
      // Palette results go stale fast and are cheap to fetch again.
      keepUnusedDataFor: 5,
    }),

    getDepartments: builder.query<DepartmentsListData, void>({
      query: () => "/departments",
    }),

    getInvestors: builder.query<InvestorsListData, string | undefined>({
      query: (q) => (q ? `/investors?q=${encodeURIComponent(q)}` : "/investors"),
    }),
  }),
});

export const {
  useGetCompaniesMapQuery,
  useGetCompaniesQuery,
  useGetCompanyBySlugQuery,
  useGetFacetsQuery,
  useGetJobsQuery,
  useGetJobByIdQuery,
  useLazySearchQuery,
  useGetDepartmentsQuery,
  useGetInvestorsQuery,
} = discoveryApi;
