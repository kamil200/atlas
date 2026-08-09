import type { CompanyDetail } from "@chowk/schema";
import { FUNDING_STAGE_LABELS } from "@chowk/schema";
import { Building2 } from "lucide-react";
import { formatCoordinates } from "@/components/map/MarkerPopup";

/*
  A compact version of the sidebar's Overview tab. The landing page embeds
  this with fixture data so the marketing section shows the real component
  rather than a picture of it.
*/
export function CompanyCard({ company }: { company: CompanyDetail }) {
  const hq = company.offices.find((office) => office.isHq) ?? company.offices[0];

  return (
    <article className="rounded-lg border border-line bg-paper p-5 shadow-card">
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-paper-2 text-ink-soft">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{company.name}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{company.tagline}</p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-peepal-700" />
          <span className="text-xs font-medium text-peepal-700">Actively hiring</span>
        </span>
        {hq ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
            {formatCoordinates(hq.lat, hq.lng)}
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Fact label="Founded" value={company.foundedYear?.toString()} />
        <Fact label="Team" value={company.employeeCount?.toLocaleString("en-IN")} />
        <Fact
          label="Stage"
          value={company.fundingStage ? FUNDING_STAGE_LABELS[company.fundingStage] : undefined}
        />
        <Fact label="Raised" value={formatUsd(company.totalFundingUsd)} />
        <Fact label="Valuation" value={formatUsd(company.valuationUsd)} />
        <Fact label="Open roles" value={hq?.openJobCount.toString()} />
      </dl>

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

      <Section title="Founders">
        <ul className="space-y-1.5">
          {company.founders.map((founder) => (
            <li key={founder.id} className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{founder.name}</span>
              <span className="truncate text-xs text-ink-soft">{founder.title}</span>
            </li>
          ))}
        </ul>
      </Section>
    </article>
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
    <section className="mt-4 border-t border-line pt-4">
      <h4 className="font-mono mb-2 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
        {title}
      </h4>
      {children}
    </section>
  );
}

function formatUsd(value: number | null): string | undefined {
  if (value === null) return undefined;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  return `$${value.toLocaleString("en-US")}`;
}
