import { Link } from "@tanstack/react-router";
import { Check, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyCard } from "@/components/company/CompanyCard";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { TrackerBoard } from "@/components/tracker/TrackerBoard";
import { Button } from "@/components/ui/button";
import {
  DEMO_APPLICATIONS,
  DEMO_COMPANY,
  DEMO_FACETS,
  DEMO_JOBS,
  DEMO_TESTIMONIALS,
} from "@/demo/fixtures";
import type { FilterKey } from "@/lib/map-search";
import { ANCHOR_NAMES } from "./marquee-names";

export function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-peepal-700">{eyebrow}</p>
      <h2 className="font-display mt-3 text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] text-ink">
        {title}
      </h2>
      <p className="mt-3 text-base text-ink-soft">{body}</p>
    </div>
  );
}

/*
  Two rows drifting in opposite directions. Paused for anyone who asked for
  reduced motion, which the CSS handles rather than JavaScript.
*/
export function LogoMarquee() {
  const half = Math.ceil(ANCHOR_NAMES.length / 2);
  const rows = [ANCHOR_NAMES.slice(0, half), ANCHOR_NAMES.slice(half)];

  /*
    Each row is rendered twice so the loop has no visible seam. The two copies
    are tagged so every chip still has its own stable key.
  */
  const doubled = (row: string[]) =>
    ["first", "second"].flatMap((copy) => row.map((name) => ({ name, key: `${copy}-${name}` })));

  return (
    <section className="border-y border-line bg-paper-2/50 py-10">
      <p className="px-6 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        Featuring startups from Bengaluru to Chennai
      </p>
      <div className="mt-6 space-y-3">
        {rows.map((row, index) => (
          <div key={row[0]} className="chowk-marquee">
            <div className={`chowk-marquee-track ${index === 1 ? "chowk-marquee-reverse" : ""}`}>
              {doubled(row).map((chip) => (
                <span
                  key={chip.key}
                  className="shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink"
                >
                  {chip.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* The real FilterPanel, filtering a small demo list in front of you. */
export function FeatureFilters() {
  const [selected, setSelected] = useState<Partial<Record<FilterKey, string[]>>>({
    department: ["design"],
  });

  const toggle = (key: FilterKey, value: string) => {
    setSelected((current) => {
      const values = current[key] ?? [];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: next };
    });
  };

  const activeCount = Object.values(selected).reduce(
    (total, values) => total + (values?.length ?? 0),
    0,
  );

  const results = useMemo(() => {
    const departments = selected.department ?? [];
    const modes = selected.workMode ?? [];
    return DEMO_JOBS.filter(
      (job) =>
        (departments.length === 0 || departments.includes(job.departmentSlug)) &&
        (modes.length === 0 || modes.includes(job.workMode)),
    );
  }, [selected]);

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="h-[420px] overflow-hidden rounded-lg border border-line bg-paper shadow-card">
        <FilterPanel
          demoMode
          facets={DEMO_FACETS}
          isLoading={false}
          selected={selected}
          activeCount={activeCount}
          onToggle={toggle}
          onClearAll={() => setSelected({})}
        />
      </div>

      <div className="rounded-lg border border-line bg-paper p-5 shadow-card">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          {results.length} matching {results.length === 1 ? "role" : "roles"}
        </p>
        <ul className="mt-4 space-y-2">
          {results.length === 0 ? (
            <li className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
              No startups match these filters. Loosen one and try again.
            </li>
          ) : (
            results.map((job) => (
              <li key={job.id} className="rounded-md border border-line bg-paper-2/40 px-4 py-3">
                <p className="text-sm font-medium text-ink">{job.title}</p>
                <p className="font-mono mt-1 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                  {[job.departmentName, job.city ?? "Remote", job.workMode].join(" · ")}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function FeatureCompany() {
  return (
    <div className="mx-auto max-w-lg">
      <CompanyCard company={DEMO_COMPANY} />
    </div>
  );
}

export function FeatureTracker() {
  const [applications, setApplications] = useState(DEMO_APPLICATIONS);

  return (
    <div className="rounded-lg border border-line bg-paper p-5 shadow-card">
      <TrackerBoard
        applications={applications}
        onChangeStatus={(jobId, status) =>
          setApplications((current) =>
            current.map((item) => (item.jobId === jobId ? { ...item, status } : item)),
          )
        }
        onRemove={(jobId) =>
          setApplications((current) => current.filter((item) => item.jobId !== jobId))
        }
      />
    </div>
  );
}

/* Fictional names and original quotes — nothing lifted from anywhere. */
export function TestimonialWall() {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
      {DEMO_TESTIMONIALS.map((entry) => (
        <figure
          key={entry.name}
          className="break-inside-avoid rounded-lg rounded-bl-sm border border-line bg-paper-2 p-4"
        >
          <blockquote className="text-sm leading-relaxed text-ink">“{entry.quote}”</blockquote>
          <figcaption className="mt-3 flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink">{entry.name}</span>
              <span className="block truncate text-[11px] text-ink-soft">{entry.role}</span>
            </span>
            {entry.reaction ? (
              <span className="shrink-0 rounded-full border border-line bg-paper px-2 py-0.5 text-xs">
                {entry.reaction}
              </span>
            ) : null}
          </figcaption>
          {entry.read ? (
            <p className="mt-2 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
              {entry.read}
            </p>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

export function CtaCard() {
  const points = [
    "Ninety curated startups, not a job-board firehose",
    "Every role pinned to the office you would actually walk into",
    "Founders, funding, and investors before you apply",
    "Free, and no recruiter will call you",
  ];

  return (
    <div className="rounded-xl border border-line bg-paper-2 p-8 shadow-card sm:p-12">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] text-ink">
          Start with your own neighbourhood
        </h2>
        <ul className="mt-6 space-y-2 text-left">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-peepal-600" aria-hidden="true" />
              <span className="text-sm text-ink">{point}</span>
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="mt-8">
          <Link to="/map">
            <MapPin className="size-4" aria-hidden="true" />
            Get started
          </Link>
        </Button>
      </div>
    </div>
  );
}
