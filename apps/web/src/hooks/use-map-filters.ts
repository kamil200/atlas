import { type MapSearchParams, toFilterParams } from "@chowk/schema";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { countActiveFilters, FILTER_KEYS, type FilterKey } from "@/lib/map-search";

/*
  The URL is the filter state. Back and forward walk the history, a link
  carries the whole view, and a reload restores it — none of which is true
  when filters live in a component.
*/
export function useMapFilters() {
  const search = useSearch({ from: "/map" });
  const navigate = useNavigate({ from: "/map" });

  /*
    What actually goes to the API. companySlug and jobId are stripped and the
    arrays are sorted, so opening a company never looks like a filter change
    and never refetches the map.
  */
  const apiFilters = useMemo(() => toFilterParams(search), [search]);

  const toggle = useCallback(
    (key: FilterKey, value: string) => {
      navigate({
        search: (prev: MapSearchParams) => {
          const current = prev[key] ?? [];
          const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
          return { ...prev, [key]: next.length > 0 ? next : undefined };
        },
      });
    },
    [navigate],
  );

  const clearAll = useCallback(() => {
    navigate({
      search: (prev: MapSearchParams) => {
        const cleared: MapSearchParams = { ...prev };
        for (const key of FILTER_KEYS) cleared[key] = undefined;
        cleared.q = undefined;
        return cleared;
      },
    });
  }, [navigate]);

  const openCompany = useCallback(
    (companySlug: string | undefined, jobId?: string) => {
      navigate({ search: (prev: MapSearchParams) => ({ ...prev, companySlug, jobId }) });
    },
    [navigate],
  );

  const openJob = useCallback(
    (jobId: string | undefined) => {
      navigate({ search: (prev: MapSearchParams) => ({ ...prev, jobId }) });
    },
    [navigate],
  );

  const setCity = useCallback(
    (city: string) => {
      navigate({ search: (prev: MapSearchParams) => ({ ...prev, city: [city] }) });
    },
    [navigate],
  );

  return {
    search,
    apiFilters,
    activeCount: countActiveFilters(search),
    toggle,
    clearAll,
    openCompany,
    openJob,
    setCity,
  };
}
