import type { ResumeData, ResumesListData } from "@chowk/schema";
import { baseApi } from "./base-api";

export const resumeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getResumes: builder.query<ResumesListData, void>({
      query: () => "/resumes",
      providesTags: ["Resume"],
    }),

    uploadResume: builder.mutation<ResumeData, File>({
      query: (file) => {
        // Let the browser set the multipart boundary; setting it by hand breaks it.
        const body = new FormData();
        body.append("file", file);
        return { url: "/resumes", method: "POST", body };
      },
      invalidatesTags: ["Resume"],
    }),

    deleteResume: builder.mutation<Record<string, never>, string>({
      query: (id) => ({ url: `/resumes?id=${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: ["Resume"],
    }),

    setDefaultResume: builder.mutation<ResumeData, string>({
      query: (id) => ({ url: "/resumes", method: "PATCH", body: { id, isDefault: true } }),
      invalidatesTags: ["Resume"],
    }),
  }),
});

export const {
  useGetResumesQuery,
  useUploadResumeMutation,
  useDeleteResumeMutation,
  useSetDefaultResumeMutation,
} = resumeApi;
