import type { ApplicationDto, JobSummary } from "@atlas/schema";
import { WORK_MODE_LABELS } from "@atlas/schema";
import { ArrowLeft, Bookmark, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SimpleApplyDialog } from "@/components/company/SimpleApplyDialog";
import { Button } from "@/components/ui/button";
import { SheetTitle } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { useUpdateApplicationStatusMutation } from "@/store/api/application-api";
import { useGetJobByIdQuery } from "@/store/api/discovery-api";
import { formatSalary } from "./JobRow";

/*
  Lives inside the same Sheet as the company. The full description is not on
  JobSummary, so it is fetched here — the row the user clicked already gave us
  everything needed to render the header while that request is in flight.
*/
export function JobDetailPanel({
  job,
  companyName,
  application,
  onBack,
  onToggleSave,
}: {
  job: JobSummary;
  companyName: string;
  application?: ApplicationDto;
  onBack: () => void;
  onToggleSave: () => void;
}) {
  const { data } = useGetJobByIdQuery(job.id);
  const { isAuthenticated } = useCurrentUser();
  const [markApplied] = useUpdateApplicationStatusMutation();
  const [applyOpen, setApplyOpen] = useState(false);

  const detail = data?.job;
  const isSaved = Boolean(application);
  const hasApplied = Boolean(application && application.status !== "SAVED");
  const salary = formatSalary(job);

  const onMarkApplied = async () => {
    try {
      await markApplied({ jobId: job.id, status: "APPLIED" }).unwrap();
      toast.success("Marked as applied. Fingers crossed.");
    } catch {
      toast.error("Couldn't update this job. Check your connection and try again.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-peepal-700 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to {companyName}
        </button>

        <SheetTitle className="mt-3 text-lg leading-tight">{job.title}</SheetTitle>

        <p className="font-mono mt-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
          {[job.departmentName, job.city ?? "Remote", WORK_MODE_LABELS[job.workMode], job.seniority]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {salary ? <p className="mt-2 text-sm font-medium text-ink">{salary} per year</p> : null}

        <p className="mt-1 text-xs text-ink-soft">Posted {relativeDate(job.postedAt)}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {detail ? (
          <div className="whitespace-pre-line text-sm leading-relaxed text-ink">
            {detail.description}
          </div>
        ) : (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-3 animate-pulse rounded bg-paper-2" />
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-line px-5 py-4">
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={isSaved}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md border border-line transition-transform",
            "hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500",
            "active:scale-110 motion-reduce:active:scale-100",
          )}
          aria-label={isSaved ? "Remove from saved" : "Save job"}
        >
          <Bookmark
            className={cn("size-4", isSaved ? "fill-peepal-600 text-peepal-600" : "text-ink-soft")}
            aria-hidden="true"
          />
        </button>

        {hasApplied ? (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-peepal-tint px-3 py-2 text-sm font-medium text-peepal-700">
            <Check className="size-4" aria-hidden="true" />
            Applied
          </span>
        ) : detail?.applyUrl ? (
          <>
            <Button asChild className="flex-1">
              <a href={detail.applyUrl} target="_blank" rel="noreferrer">
                Apply on company site
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
            {isAuthenticated ? (
              <Button variant="outline" onClick={onMarkApplied}>
                Mark applied
              </Button>
            ) : null}
          </>
        ) : (
          <Button className="flex-1" onClick={() => setApplyOpen(true)}>
            Simple apply
          </Button>
        )}
      </footer>

      <SimpleApplyDialog job={job} open={applyOpen} onOpenChange={setApplyOpen} />
    </div>
  );
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}
