import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: LandingPage });

/* Placeholder until phase 7 builds the real landing page. */
function LandingPage() {
  return (
    <main className="mx-auto flex h-full max-w-3xl flex-col justify-center px-6">
      <Wordmark />
      <h1 className="font-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05]">
        Your next job isn't in a list.
        <br />
        It's around the corner.
      </h1>
      <p className="mt-5 max-w-lg text-base text-ink-soft">
        Explore startups hiring near you on a map, filter by role and city, and apply without
        leaving the page.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link to="/map">Explore the map</Link>
        </Button>
      </div>
    </main>
  );
}
