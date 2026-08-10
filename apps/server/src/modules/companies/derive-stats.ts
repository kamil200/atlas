import type { CompanyStats, JobSummary, SalaryBand } from "@atlas/schema";
import { SENIORITY_LABELS } from "@atlas/schema";

/*
  Everything a company profile says about its own hiring is worked out here from
  its open roles. None of it is stored, so a number on the page can never
  disagree with the jobs listed underneath it.

  `now` is a parameter rather than a call to the clock so the week buckets are
  testable.
*/

const WEEKS_SHOWN = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function deriveStats(jobs: readonly JobSummary[], now: Date): CompanyStats {
  const cities = new Set<string>();
  const departments = new Set<string>();
  const weeklyPostings = new Array<number>(WEEKS_SHOWN).fill(0);
  let postedThisWeek = 0;

  for (const job of jobs) {
    if (job.city) cities.add(job.city);
    departments.add(job.departmentSlug);

    const age = now.getTime() - new Date(job.postedAt).getTime();
    if (age < WEEK_MS) postedThisWeek += 1;

    /*
      Bucket 7 is this week, bucket 0 is eight weeks ago. Anything older simply
      falls off the chart rather than piling up in the first bar, which would
      make an old company look like it had a hiring spree.
    */
    const weeksAgo = Math.floor(age / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < WEEKS_SHOWN) {
      weeklyPostings[WEEKS_SHOWN - 1 - weeksAgo] += 1;
    }
  }

  return {
    openJobCount: jobs.length,
    postedThisWeek,
    cityCount: cities.size,
    departmentCount: departments.size,
    weeklyPostings,
  };
}

/*
  What each level actually pays here, from the ranges the company posted.

  A role with no advertised salary is left out rather than counted as zero —
  one silent job would otherwise drag a band's floor to nothing.
*/
export function deriveSalaryBands(jobs: readonly JobSummary[]): SalaryBand[] {
  const byLevel = new Map<string, JobSummary[]>();

  for (const job of jobs) {
    if (job.seniority === null) continue;
    if (job.salaryMin === null && job.salaryMax === null) continue;
    const bucket = byLevel.get(job.seniority);
    if (bucket) bucket.push(job);
    else byLevel.set(job.seniority, [job]);
  }

  const bands: SalaryBand[] = [];

  for (const [seniority, group] of byLevel) {
    const midpoints = group.map(midpoint).sort((a, b) => a - b);

    bands.push({
      seniority: SENIORITY_LABELS[seniority as keyof typeof SENIORITY_LABELS] ?? seniority,
      jobCount: group.length,
      minSalary: Math.min(...group.map((job) => job.salaryMin ?? job.salaryMax ?? 0)),
      medianSalary: median(midpoints),
      maxSalary: Math.max(...group.map((job) => job.salaryMax ?? job.salaryMin ?? 0)),
      // The seed is single-currency; if that ever changes this shows the common one.
      currency: group[0]?.currency ?? "INR",
    });
  }

  // Most junior first, so the bands read as a ladder.
  const order = Object.keys(SENIORITY_LABELS).map(
    (key) => SENIORITY_LABELS[key as keyof typeof SENIORITY_LABELS],
  );
  return bands.sort((a, b) => order.indexOf(a.seniority) - order.indexOf(b.seniority));
}

/* A job's single representative number, so a range can be ranked against others. */
function midpoint(job: JobSummary): number {
  if (job.salaryMin !== null && job.salaryMax !== null) {
    return Math.round((job.salaryMin + job.salaryMax) / 2);
  }
  return job.salaryMin ?? job.salaryMax ?? 0;
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

/* A role posted within this many days counts as new, on a pin and in the stats. */
export const NEW_JOB_DAYS = 7;

/* Five or more roles at one office is a real hiring push rather than a vacancy. */
export const HOT_JOB_COUNT = 5;

export function isRecent(postedAt: Date, now: Date): boolean {
  return now.getTime() - postedAt.getTime() < NEW_JOB_DAYS * DAY_MS;
}

/* The cutoff a query compares postedAt against to find this week's roles. */
export function freshSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - NEW_JOB_DAYS * DAY_MS);
}
