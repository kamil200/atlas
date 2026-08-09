import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import {
  CtaCard,
  FeatureCompany,
  FeatureFilters,
  FeatureTracker,
  LogoMarquee,
  SectionHeading,
  TestimonialWall,
} from "@/components/landing/LandingSections";
import { MapCanvas } from "@/components/map/MapCanvas";
import { summariseOffices } from "@/components/map/use-cluster-layer";
import { Wordmark } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useGetCompaniesMapQuery } from "@/store/api/discovery-api";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const { isAuthenticated } = useCurrentUser();
  // Same cache entry the map page uses, so opening /map next costs nothing.
  const { data, isLoading } = useGetCompaniesMapQuery({});
  const offices = data?.offices ?? [];
  const stats = summariseOffices(offices);

  return (
    <div className="h-full overflow-y-auto">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/submit-company">Add company</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={isAuthenticated ? "/map" : "/auth/login"}>
              {isAuthenticated ? "Open the map" : "Log in"}
            </Link>
          </Button>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pt-16">
        <h1 className="font-display max-w-4xl text-[clamp(2.3rem,5.6vw,4.1rem)] leading-[1.14] text-ink">
          Your next job isn't in a{" "}
          <span className="relative whitespace-nowrap text-ink-soft">
            list
            <span
              className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-ink-soft"
              aria-hidden="true"
            />
          </span>
          .
          <br />
          It's around the{" "}
          <span className="whitespace-nowrap rounded-full bg-[#E2F1E6] px-4 pb-1 text-peepal-700">
            corner{" "}
            <MapPin className="inline size-[0.7em] -translate-y-[0.1em]" aria-hidden="true" />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          Chowk puts every startup hiring in your city on one map. Filter by role, city, and funding
          stage, read the founder and funding story, then apply without leaving the page.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link to="/map">
              Explore the map
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
            {isLoading
              ? "Counting the chowk…"
              : `${stats.companies} companies · ${stats.openJobs.toLocaleString("en-IN")} open roles · updated daily`}
          </p>
        </div>
      </header>

      {/* The real map component, read-only, so the hero is the product. */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-line shadow-card">
          <MapCanvas offices={offices} onSelectCompany={() => {}} interactive={false} />
          <Link
            to="/map"
            className="absolute inset-0 grid place-items-end justify-center bg-gradient-to-t from-paper/85 via-transparent to-transparent pb-6"
          >
            <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-pop">
              Open the map →
            </span>
          </Link>
        </div>
      </section>

      <div className="mt-16">
        <LogoMarquee />
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Filters"
          title="Filter signal from noise"
          body="Every option carries a live count, worked out with its own filter left out — so narrowing down never leaves you in a dead end you cannot back out of. Try it."
        />
        <div className="mt-8">
          <FeatureFilters />
        </div>
      </section>

      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Company profiles"
            title="Know before you knock"
            body="Who founded it, who backed it, how much they raised, and how many people you would be joining. All of it before you write a cover note."
          />
          <div className="mt-8">
            <FeatureCompany />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Tracker"
          title="A tracker that remembers so you don't"
          body="Saved, applied, interviewing, offer. One row per role, moved with a dropdown. Change a status below and watch it move."
        />
        <div className="mt-8">
          <FeatureTracker />
        </div>
      </section>

      <section className="border-t border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="What people say"
            title="Notes from the square"
            body="Made-up people, honest sentiment. This is a portfolio project, so the reviews are as fictional as the testimonials on every other landing page — we just say so."
          />
          <div className="mt-8">
            <TestimonialWall />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <CtaCard />
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-sm text-sm text-ink-soft">
                P.S. every pin is a real office. The jobs are demo data, so please do not turn up
                with a resume expecting chai.
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              <li>
                <a
                  href="https://github.com"
                  className="hover:text-peepal-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source on GitHub
                </a>
              </li>
              <li>
                <Link to="/map" className="hover:text-peepal-700 hover:underline">
                  The map
                </Link>
              </li>
              <li>
                <Link to="/submit-company" className="hover:text-peepal-700 hover:underline">
                  Add a company
                </Link>
              </li>
            </ul>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
            Chowk · demo data, not live listings · built as a portfolio project
          </p>
        </div>
      </footer>
    </div>
  );
}
