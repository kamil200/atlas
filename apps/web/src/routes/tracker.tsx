import type { ApplicationStatus } from "@chowk/schema";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell, RequireAuth } from "@/components/shared/PageShell";
import { TrackerBoard } from "@/components/tracker/TrackerBoard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetApplicationsQuery,
  useUnsaveJobMutation,
  useUpdateApplicationStatusMutation,
} from "@/store/api/application-api";

export const Route = createFileRoute("/tracker")({ component: TrackerPage });

function TrackerPage() {
  return (
    <RequireAuth>
      <TrackerContent />
    </RequireAuth>
  );
}

function TrackerContent() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetApplicationsQuery();
  const [updateStatus] = useUpdateApplicationStatusMutation();
  const [unsave] = useUnsaveJobMutation();

  const changeStatus = async (jobId: string, status: ApplicationStatus) => {
    try {
      await updateStatus({ jobId, status }).unwrap();
    } catch {
      toast.error("Couldn't move that job. Check your connection and try again.");
    }
  };

  const remove = async (jobId: string) => {
    try {
      await unsave(jobId).unwrap();
    } catch {
      toast.error("Couldn't remove that job. Check your connection and try again.");
    }
  };

  return (
    <PageShell
      title="Tracker"
      subtitle="Everything you saved and everywhere you applied, in one list."
    >
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-line bg-paper p-6">
          <p className="text-sm text-ink">Couldn't load your tracker.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper"
          >
            Retry
          </button>
        </div>
      ) : (
        <TrackerBoard
          applications={data?.items ?? []}
          onChangeStatus={changeStatus}
          onRemove={remove}
          onOpen={(application) =>
            navigate({
              to: "/map",
              search: {
                companySlug: application.job.companySlug,
                jobId: application.jobId,
              },
            })
          }
        />
      )}
    </PageShell>
  );
}
