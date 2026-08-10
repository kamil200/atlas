import { FUNDING_STAGE_LABELS } from "@chowk/schema";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import { formatCoordinates } from "@/components/map/MarkerPopup";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useGetCompanyBySlugQuery } from "@/store/api/discovery-api";
import { JobDetailPanel } from "./JobDetailPanel";
import { JobRow } from "./JobRow";

/*
  Opens when companySlug is in the URL. It is a Sheet rather than a route so
  the map behind it keeps its camera, its WebGL context, and its clusters.
*/
export function CompanySidebar({
  companySlug,
  jobId,
  onClose,
  onOpenJob,
  onFlyTo,
}: {
  companySlug?: string;
  jobId?: string;
  onClose: () => void;
  onOpenJob: (jobId: string | undefined) => void;
  onFlyTo: (lat: number, lng: number) => void;
}) {
  const { data, isLoading, isError, isUninitialized, refetch } = useGetCompanyBySlugQuery(
    companySlug ?? "",
    { skip: !companySlug },
  );
  const { byJobId, toggle } = useSavedJobs();

  const company = data?.company;
  const openJob = company?.jobs.find((job) => job.id === jobId);
  const hq = company?.offices.find((office) => office.isHq) ?? company?.offices[0];

  return (
    <Sheet open={Boolean(companySlug)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        aria-describedby={undefined}
      >
        {/*
          isUninitialized matters on the way out. Closing the sheet clears the
          slug, which skips the query, so there is no data and no error — and
          the panel used to repaint as "we could not load that company" for the
          300ms it spends sliding away.
        */}
        {isLoading || isUninitialized ? (
          <SidebarSkeleton />
        ) : isError || !company ? (
          <div className="p-6">
            <SheetTitle className="text-lg">We could not load that company</SheetTitle>
            <SheetDescription className="mt-1 text-sm text-ink-soft">
              It may have been removed, or the connection dropped.
            </SheetDescription>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper"
            >
              Try again
            </button>
          </div>
        ) : openJob ? (
          <JobDetailPanel
            job={openJob}
            companyName={company.name}
            application={byJobId.get(openJob.id)}
            onBack={() => onOpenJob(undefined)}
            onToggleSave={() => toggle(openJob)}
          />
        ) : (
          <div className="flex h-full flex-col">
            <header className="border-b border-line px-5 pb-4 pt-5">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-paper-2 text-ink-soft">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt=""
                      className="size-full rounded-md object-cover"
                    />
                  ) : (
                    <Building2 className="size-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg leading-tight">{company.name}</SheetTitle>
                  {company.tagline ? (
                    <p className="mt-0.5 text-sm text-ink-soft">{company.tagline}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {company.hiringStatus === "ACTIVELY_HIRING" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-peepal-700" />
                    <span className="text-xs font-medium text-peepal-700">Actively hiring</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-stone" />
                    <span className="text-xs font-medium text-ink-soft">Quiet right now</span>
                  </span>
                )}
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-peepal-700 hover:underline"
                  >
                    Website
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
                {hq ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    {formatCoordinates(hq.lat, hq.lng)}
                  </span>
                ) : null}
              </div>
            </header>

            <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-5 mt-3 w-fit">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="offices">Offices ({company.offices.length})</TabsTrigger>
                <TabsTrigger value="jobs">Jobs ({company.jobs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
                <p className="mt-4 text-sm leading-relaxed text-ink">{company.description}</p>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Fact label="Founded" value={company.foundedYear?.toString()} />
                  <Fact label="Team size" value={company.employeeCount?.toLocaleString("en-IN")} />
                  <Fact
                    label="Stage"
                    value={
                      company.fundingStage ? FUNDING_STAGE_LABELS[company.fundingStage] : undefined
                    }
                  />
                  <Fact label="Raised" value={formatUsd(company.totalFundingUsd)} />
                  <Fact label="Valuation" value={formatUsd(company.valuationUsd)} />
                </dl>

                {company.industries.length > 0 ? (
                  <Section title="Industries">
                    <div className="flex flex-wrap gap-1.5">
                      {company.industries.map((industry) => (
                        <span
                          key={industry}
                          className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-xs text-ink"
                        >
                          {industry}
                        </span>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {company.investors.length > 0 ? (
                  <Section title="Investors">
                    <div className="flex flex-wrap gap-1.5">
                      {company.investors.map((investor) => (
                        <span
                          key={investor.id}
                          className="rounded-full bg-peepal-tint px-2.5 py-1 text-xs font-medium text-peepal-700"
                        >
                          {investor.name}
                        </span>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {company.founders.length > 0 ? (
                  <Section title="Founders">
                    <ul className="space-y-2">
                      {company.founders.map((founder) => (
                        <li key={founder.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {founder.name}
                            </span>
                            <span className="block truncate text-xs text-ink-soft">
                              {founder.title}
                            </span>
                          </span>
                          {founder.linkedinUrl ? (
                            <a
                              href={founder.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${founder.name} on LinkedIn`}
                              className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-soft hover:bg-paper-2 hover:text-peepal-700"
                            >
                              <ExternalLink className="size-4" aria-hidden="true" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}
              </TabsContent>

              <TabsContent value="offices" className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
                <ul className="mt-4 space-y-1">
                  {company.offices.map((office) => (
                    <li key={office.id}>
                      <button
                        type="button"
                        onClick={() => onFlyTo(office.lat, office.lng)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
                      >
                        <MapPin className="size-4 shrink-0 text-peepal-600" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-ink">
                              {office.city}
                            </span>
                            {office.isHq ? (
                              <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-ink-soft">
                                HQ
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                            {formatCoordinates(office.lat, office.lng)} · {office.openJobCount} open
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="jobs" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
                {company.jobs.length === 0 ? (
                  <p className="px-2 pt-6 text-sm text-ink-soft">
                    No open roles here today. The map has plenty more.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-0.5">
                    {company.jobs.map((job) => (
                      <JobRow
                        key={job.id}
                        job={job}
                        application={byJobId.get(job.id)}
                        onOpen={() => onOpenJob(job.id)}
                        onToggleSave={() => toggle(job)}
                      />
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="font-mono mb-2 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* Funding reads better rounded than exact: $741M, not $741,000,000. */
function formatUsd(value: number | null): string | undefined {
  if (value === null) return undefined;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  return `$${value.toLocaleString("en-US")}`;
}

function SidebarSkeleton() {
  return (
    <div className="p-5">
      <SheetTitle className="sr-only">Loading company</SheetTitle>
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <Skeleton className="mt-5 h-8 w-56" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-10" />
        ))}
      </div>
    </div>
  );
}
