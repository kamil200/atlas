import type { AuthUserData, LoginBody, RegisterBody } from "@chowk/schema";
import { baseApi } from "./base-api";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<AuthUserData, void>({
      query: () => "/auth/me",
      providesTags: ["Me"],
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

export const { useGetMeQuery, useLoginMutation, useRegisterMutation, useLogoutMutation } = authApi;
