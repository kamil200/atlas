import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell, RequireAuth } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetAdminSubmissionsQuery,
  useReviewSubmissionMutation,
} from "@/store/api/submission-api";

export const Route = createFileRoute("/admin/submissions")({ component: AdminSubmissionsPage });

function AdminSubmissionsPage() {
  return (
    <RequireAuth adminOnly>
      <AdminSubmissionsContent />
    </RequireAuth>
  );
}

function AdminSubmissionsContent() {
  const { data, isLoading } = useGetAdminSubmissionsQuery("PENDING");
  const [review, { isLoading: isReviewing }] = useReviewSubmissionMutation();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await review({ id, status, note: notes[id]?.trim() || undefined }).unwrap();
      toast.success(status === "APPROVED" ? "Approved. It is on the map." : "Rejected.");
    } catch {
      toast.error("Couldn't save that decision. Check your connection and try again.");
    }
  };

  return (
    <PageShell title="Review queue" subtitle="Companies waiting to go on the map.">
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-paper-2/50 px-6 py-12 text-center">
          <p className="text-sm text-ink">Queue is empty. Nothing waiting on you.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data?.items.map((submission) => (
            <li
              key={submission.id}
              className="rounded-lg border border-line bg-paper p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {submission.companyName}
                  </p>
                  <p className="font-mono mt-1 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {submission.officeCount} office{submission.officeCount === 1 ? "" : "s"} · sent
                    by {submission.submittedByEmail}
                  </p>
                </div>
                <a
                  href={`/companies/${submission.companySlug}`}
                  className="shrink-0 text-xs font-medium text-peepal-700 hover:underline"
                >
                  Preview
                </a>
              </div>

              <Input
                value={notes[submission.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [submission.id]: event.target.value }))
                }
                placeholder="Note for the submitter (optional)"
                className="mt-3 h-9 text-sm"
                aria-label={`Review note for ${submission.companyName}`}
              />

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={isReviewing}
                  onClick={() => decide(submission.id, "APPROVED")}
                >
                  <Check className="size-4" aria-hidden="true" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isReviewing}
                  onClick={() => decide(submission.id, "REJECTED")}
                >
                  <X className="size-4" aria-hidden="true" />
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
