import type {
  ApplicationData,
  ApplicationDto,
  ApplicationStatus,
  ApplicationsListData,
  JobSummary,
  SimpleApplyBody,
} from "@atlas/schema";
import { baseApi } from "./base-api";

/*
  The bookmark button has to feel instant, so every mutation patches the
  cached list before the request goes out and rolls the patch back if the
  server says no. RTK Query's invalidation then refreshes the real row.

  One cache entry holds every application; the tracker groups by status in the
  component. That keeps the optimistic patches pointed at a single place.
*/
type SaveJobArgs = { jobId: string; job?: JobSummary };

function optimisticApplication(jobId: string, job: JobSummary): ApplicationDto {
  const now = new Date().toISOString();
  return {
    // Replaced by the server's row the moment the request lands.
    id: `pending-${jobId}`,
    jobId,
    status: "SAVED",
    applyMethod: null,
    resumeId: null,
    coverNote: null,
    appliedAt: null,
    createdAt: now,
    updatedAt: now,
    job,
  };
}

export const applicationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplications: builder.query<ApplicationsListData, void>({
      query: () => "/applications",
      providesTags: ["Application"],
    }),

    saveJob: builder.mutation<ApplicationData, SaveJobArgs>({
      query: ({ jobId }) => ({ url: "/applications", method: "PUT", body: { jobId } }),
      async onQueryStarted({ jobId, job }, { dispatch, queryFulfilled }) {
        if (!job) return;
        const patch = dispatch(
          applicationApi.util.updateQueryData("getApplications", undefined, (draft) => {
            if (draft.items.some((item) => item.jobId === jobId)) return;
            draft.items.unshift(optimisticApplication(jobId, job));
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Application"],
    }),

    unsaveJob: builder.mutation<Record<string, never>, string>({
      query: (jobId) => ({
        url: `/applications?jobId=${encodeURIComponent(jobId)}`,
        method: "DELETE",
      }),
      async onQueryStarted(jobId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          applicationApi.util.updateQueryData("getApplications", undefined, (draft) => {
            draft.items = draft.items.filter((item) => item.jobId !== jobId);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Application"],
    }),

    updateApplicationStatus: builder.mutation<
      ApplicationData,
      { jobId: string; status: ApplicationStatus }
    >({
      query: (body) => ({ url: "/applications", method: "PATCH", body }),
      async onQueryStarted({ jobId, status }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          applicationApi.util.updateQueryData("getApplications", undefined, (draft) => {
            const row = draft.items.find((item) => item.jobId === jobId);
            if (row) row.status = status;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Application"],
    }),

    simpleApply: builder.mutation<ApplicationData, SimpleApplyBody>({
      query: (body) => ({ url: "/jobs/simple-apply", method: "POST", body }),
      async onQueryStarted({ jobId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          applicationApi.util.updateQueryData("getApplications", undefined, (draft) => {
            const row = draft.items.find((item) => item.jobId === jobId);
            if (row) {
              row.status = "APPLIED";
              row.applyMethod = "SIMPLE_APPLY";
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Application"],
    }),
  }),
});

export const {
  useGetApplicationsQuery,
  useSaveJobMutation,
  useUnsaveJobMutation,
  useUpdateApplicationStatusMutation,
  useSimpleApplyMutation,
} = applicationApi;
