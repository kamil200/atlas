import type { CompanyStats, SalaryBand } from "@atlas/schema";

/*
  The two cards that answer "is this place actually hiring, and what does it
  pay". Both read numbers the server derived from the same roles listed in the
  Jobs tab, so nothing here can contradict what a visitor can count themselves.
*/

export function HiringStatsCard({ stats }: { stats: CompanyStats }) {
  const peak = Math.max(...stats.weeklyPostings, 1);

  return (
    <div className="mt-5 rounded-lg bg-ink px-4 py-4 text-paper">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper/55">
            Open roles
          </p>
          <p className="font-display mt-1 text-[2rem] leading-none">{stats.openJobCount}</p>
        </div>
        {stats.postedThisWeek > 0 ? (
          <p className="rounded-full bg-peepal-500/20 px-2.5 py-1 text-xs font-medium text-peepal-400">
            +{stats.postedThisWeek} this week
          </p>
        ) : (
          <p className="text-xs text-paper/50">Nothing new this week</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat value={stats.cityCount} label={stats.cityCount === 1 ? "city" : "cities"} />
        <MiniStat
          value={stats.departmentCount}
          label={stats.departmentCount === 1 ? "team hiring" : "teams hiring"}
        />
      </div>

      <div className="mt-4">
        <div className="flex h-12 items-end gap-1" aria-hidden="true">
          {stats.weeklyPostings.map((count, index) => (
            <div
              // Fixed-length series of week buckets, so the index is the identity.
              // biome-ignore lint/suspicious/noArrayIndexKey: buckets are positional
              key={index}
              className="flex-1 rounded-sm bg-peepal-500/70"
              /*
                A week with no postings still gets a sliver, so the chart reads
                as a timeline rather than looking broken.
              */
              style={{ height: `${Math.max((count / peak) * 100, 6)}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-paper/45">
          <span>8 weeks ago</span>
          <span>this week</span>
        </div>
        <p className="sr-only">
          Roles posted per week over the last eight weeks: {stats.weeklyPostings.join(", ")}.
        </p>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md bg-paper/10 px-3 py-2">
      <p className="font-display text-lg leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-paper/60">{label}</p>
    </div>
  );
}

export function SalaryBandsCard({ bands }: { bands: SalaryBand[] }) {
  if (bands.length === 0) return null;

  // One shared scale, or a junior band would look as well paid as a lead one.
  const ceiling = Math.max(...bands.map((band) => band.maxSalary));

  return (
    <div className="mt-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
        What it pays
      </h3>
      <ul className="mt-2.5 space-y-3">
        {bands.map((band) => (
          <li key={band.seniority}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{band.seniority}</span>
              <span className="font-mono text-[11px] text-ink-soft">
                {formatSalary(band.minSalary)} – {formatSalary(band.maxSalary)}
              </span>
            </div>

            {/* The bar spans the band's own range against the highest band's ceiling. */}
            <div className="relative mt-1.5 h-1.5 rounded-full bg-paper-2">
              <div
                className="absolute inset-y-0 rounded-full bg-peepal-500/45"
                style={{
                  left: `${(band.minSalary / ceiling) * 100}%`,
                  width: `${((band.maxSalary - band.minSalary) / ceiling) * 100}%`,
                }}
              />
              <div
                className="absolute inset-y-0 w-0.5 rounded-full bg-peepal-700"
                style={{ left: `${(band.medianSalary / ceiling) * 100}%` }}
                title={`Median ${formatSalary(band.medianSalary)}`}
              />
            </div>

            <p className="mt-1 text-[11px] text-ink-soft">
              median {formatSalary(band.medianSalary)} · {band.jobCount}{" "}
              {band.jobCount === 1 ? "role" : "roles"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-soft">
        From the ranges these roles advertise. Roles with no stated salary are left out.
      </p>
    </div>
  );
}

/* Indian salaries are read in lakhs, so 4200000 shows as ₹42L rather than 4.2M. */
function formatSalary(amount: number): string {
  const lakhs = amount / 100_000;
  const rounded = lakhs >= 100 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
  return `₹${rounded}L`;
}
