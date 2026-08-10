import type { ApplicationDto, ApplicationStatus } from "@chowk/schema";
import { APPLICATION_STATUS_LABELS, WORK_MODE_LABELS } from "@chowk/schema";
import { Building2, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_ORDER: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

/* Chip colours come straight from BRAND §7. */
const CHIP: Record<ApplicationStatus, string> = {
  SAVED: "border border-line bg-paper text-ink-soft",
  APPLIED: "bg-peepal-tint text-peepal-700",
  // Darkened from #8A6D00, which was 4.36:1 on the marigold tint at 10px — under AA.
  INTERVIEWING: "bg-marigold-tint text-[#6F5600]",
  OFFER: "bg-peepal-600 text-paper",
  REJECTED: "border border-line bg-paper-2 text-ink-soft",
  WITHDRAWN: "border border-line bg-paper-2 text-ink-soft",
};

export type TrackerBoardProps = {
  applications: ApplicationDto[];
  onChangeStatus: (jobId: string, status: ApplicationStatus) => void;
  onRemove: (jobId: string) => void;
  onOpen?: (application: ApplicationDto) => void;
  /** Landing page renders this with fixtures and inert handlers. */
  demoMode?: boolean;
};

export function TrackerBoard({
  applications,
  onChangeStatus,
  onRemove,
  onOpen,
  demoMode = false,
}: TrackerBoardProps) {
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: applications.filter((application) => application.status === status),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper-2/50 px-6 py-12 text-center">
        <p className="text-sm text-ink">
          Nothing saved yet. Wander the map — something will catch your eye.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.status}>
          <h2 className="font-mono mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
            {APPLICATION_STATUS_LABELS[group.status]}
            <span className="rounded-full bg-paper-2 px-1.5 py-0.5 text-[10px]">
              {group.items.length}
            </span>
          </h2>

          <ul className="space-y-2">
            {group.items.map((application) => (
              <li
                key={application.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3 shadow-card transition-shadow hover:shadow-pop"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-paper-2 text-ink-soft">
                  {application.job.companyLogoUrl ? (
                    <img
                      src={application.job.companyLogoUrl}
                      alt=""
                      className="size-full rounded-md object-cover"
                    />
                  ) : (
                    <Building2 className="size-4" aria-hidden="true" />
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => onOpen?.(application)}
                  className="min-w-0 flex-1 text-left"
                  disabled={!onOpen}
                >
                  <span className="block truncate text-sm font-medium text-ink">
                    {application.job.title}
                  </span>
                  <span className="font-mono mt-0.5 block truncate text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {[
                      application.job.companyName,
                      application.job.city ?? "Remote",
                      WORK_MODE_LABELS[application.job.workMode],
                    ].join(" · ")}
                  </span>
                </button>

                <span
                  className={cn(
                    "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:block",
                    CHIP[application.status],
                  )}
                >
                  {APPLICATION_STATUS_LABELS[application.status]}
                </span>

                <Select
                  value={application.status}
                  onValueChange={(value) =>
                    onChangeStatus(application.jobId, value as ApplicationStatus)
                  }
                  disabled={demoMode}
                >
                  <SelectTrigger className="h-8 w-[130px] shrink-0 text-xs" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => onRemove(application.jobId)}
                  aria-label={`Remove ${application.job.title}`}
                  disabled={demoMode}
                  className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-soft transition-colors hover:bg-paper-2 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500 disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
