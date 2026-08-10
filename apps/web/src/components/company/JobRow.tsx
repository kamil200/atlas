import type { ApplicationDto, JobSummary } from "@atlas/schema";
import { WORK_MODE_LABELS } from "@atlas/schema";
import { Bookmark, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatSalary(job: JobSummary): string | null {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  const lakh = (value: number) => `${Math.round(value / 100_000)}L`;
  if (job.salaryMin !== null && job.salaryMax !== null) {
    return `₹${lakh(job.salaryMin)} – ₹${lakh(job.salaryMax)}`;
  }
  return `₹${lakh((job.salaryMin ?? job.salaryMax) as number)}`;
}

export function JobRow({
  job,
  application,
  onOpen,
  onToggleSave,
}: {
  job: JobSummary;
  application?: ApplicationDto;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const isSaved = Boolean(application);
  const hasApplied = Boolean(application && application.status !== "SAVED");
  const meta = [job.departmentName, job.city ?? "Remote", WORK_MODE_LABELS[job.workMode]];

  return (
    <li className="group relative flex items-center gap-2 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-paper-2">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        {/* Stretches the click target across the row without nesting buttons. */}
        <span className="absolute inset-0 rounded-md" aria-hidden="true" />
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{job.title}</span>
          {hasApplied ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-peepal-tint px-1.5 py-0.5 text-[10px] font-medium text-peepal-700">
              <Check className="size-2.5" aria-hidden="true" />
              Applied
            </span>
          ) : null}
        </span>
        <span className="font-mono mt-1 block truncate text-[10px] uppercase tracking-[0.08em] text-ink-soft">
          {meta.join(" · ")}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${job.title}` : `Save ${job.title}`}
        className={cn(
          "relative z-10 grid size-8 shrink-0 place-items-center rounded-sm transition-transform",
          "hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500",
          "active:scale-125 motion-reduce:active:scale-100",
        )}
      >
        <Bookmark
          className={cn(
            "size-4 transition-colors",
            isSaved ? "fill-peepal-600 text-peepal-600" : "text-ink-soft",
          )}
          aria-hidden="true"
        />
      </button>

      <ChevronRight
        className="size-4 shrink-0 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </li>
  );
}
