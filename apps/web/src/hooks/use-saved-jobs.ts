import type { ApplicationDto, JobSummary } from "@chowk/schema";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useGetApplicationsQuery,
  useSaveJobMutation,
  useUnsaveJobMutation,
} from "@/store/api/application-api";
import { useCurrentUser } from "./use-current-user";

/*
  One place that answers "is this job saved" and flips it. The bookmark button
  appears in three different screens and they must all agree instantly, which
  they do because they all read the same RTK Query cache entry.
*/
export function useSavedJobs() {
  const { isAuthenticated } = useCurrentUser();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (state) => state.location.href });

  const { data } = useGetApplicationsQuery(undefined, { skip: !isAuthenticated });
  const [saveJob] = useSaveJobMutation();
  const [unsaveJob] = useUnsaveJobMutation();

  const byJobId = useMemo(() => {
    const map = new Map<string, ApplicationDto>();
    for (const application of data?.items ?? []) map.set(application.jobId, application);
    return map;
  }, [data]);

  const toggle = useCallback(
    async (job: JobSummary) => {
      if (!isAuthenticated) {
        // Send them back to what they were doing once they are signed in.
        navigate({ to: "/auth/login", search: { next: currentPath } });
        return;
      }

      const existing = byJobId.get(job.id);
      try {
        if (existing) {
          await unsaveJob(job.id).unwrap();
        } else {
          await saveJob({ jobId: job.id, job }).unwrap();
        }
      } catch {
        toast.error("Couldn't save this job. Check your connection and try again.");
      }
    },
    [byJobId, currentPath, isAuthenticated, navigate, saveJob, unsaveJob],
  );

  return {
    applications: data?.items ?? [],
    byJobId,
    savedCount: (data?.items ?? []).filter((item) => item.status === "SAVED").length,
    appliedCount: (data?.items ?? []).filter((item) => item.status !== "SAVED").length,
    toggle,
    isAuthenticated,
  };
}
