import type { AuthProvidersData, AuthUserData, LoginBody, RegisterBody } from "@atlas/schema";
import { baseApi } from "./base-api";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<AuthUserData, void>({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),

    /*
      Which social sign-ins this server has credentials for. Asked once and
      cached forever — it only changes when the server restarts with different
      environment variables.
    */
    getAuthProviders: builder.query<AuthProvidersData, void>({
      query: () => "/auth/providers",
      keepUnusedDataFor: 3600,
    }),

    login: builder.mutation<AuthUserData, LoginBody>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      // Signing in changes who everything user-scoped belongs to.
      invalidatesTags: ["Me", "Application", "Resume", "Submission"],
    }),

    register: builder.mutation<AuthUserData, RegisterBody>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Me", "Application", "Resume", "Submission"],
    }),

    logout: builder.mutation<Record<string, never>, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetAuthProvidersQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi;
