import type {
  ReviewSubmissionBody,
  SubmissionData,
  SubmissionStatus,
  SubmissionsListData,
  SubmitCompanyBody,
  SubmitCompanyData,
} from "@atlas/schema";
import { baseApi } from "./base-api";

export const submissionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitCompany: builder.mutation<SubmitCompanyData, SubmitCompanyBody>({
      query: (body) => ({ url: "/companies/submit", method: "POST", body }),
      invalidatesTags: ["Submission"],
    }),

    getMySubmissions: builder.query<SubmissionsListData, void>({
      query: () => "/submissions/mine",
      providesTags: ["Submission"],
    }),

    getAdminSubmissions: builder.query<SubmissionsListData, SubmissionStatus | undefined>({
      query: (status) => (status ? `/admin/submissions?status=${status}` : "/admin/submissions"),
      providesTags: ["Submission"],
    }),

    reviewSubmission: builder.mutation<SubmissionData, ReviewSubmissionBody>({
      query: (body) => ({ url: "/admin/submissions", method: "PATCH", body }),
      // An approved company has to show up on the map and in the counts at once.
      invalidatesTags: ["Submission", "CompanyMap", "Facets", "Company"],
    }),
  }),
});

export const {
  useSubmitCompanyMutation,
  useGetMySubmissionsQuery,
  useGetAdminSubmissionsQuery,
  useReviewSubmissionMutation,
} = submissionApi;
