import type { ApiError } from "@atlas/schema";
import type { BaseQueryFn, FetchArgs } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/*
  Every API response is wrapped in {success, data} or {success, error}.
  Unwrapping it here means no endpoint needs a transformResponse, and a
  component's `error` is always the server's {code, message} — never a raw
  fetch error it has to dig through.
*/
const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api", credentials: "include" });

const baseQueryWithEnvelope: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const body = result.error.data as { error?: ApiError } | undefined;
    return {
      error: body?.error ?? {
        code: "NETWORK_ERROR",
        message: "We could not reach the server. Check your connection and try again.",
      },
    };
  }

  const body = result.data as { success: boolean; data: unknown };
  return { data: body.data };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithEnvelope,
  tagTypes: ["Me", "Company", "CompanyMap", "Facets", "Job", "Application", "Resume", "Submission"],
  endpoints: () => ({}),
});
