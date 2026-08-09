import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

/* Shared frame for the non-map screens so they all sit on the same grid. */
export function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-ink-soft">{subtitle}</p> : null}
          </div>
          {action}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

/* Signed-out visitors get a way in rather than an empty screen. */
export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-peepal-600" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl text-ink">Sign in to see this</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Your saved roles and applications live behind a login.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (adminOnly && user?.role !== "ADMIN") {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl text-ink">Not your queue</h1>
          <p className="mt-2 text-sm text-ink-soft">This page is for admins.</p>
          <Button asChild className="mt-5">
            <Link to="/map">Back to the map</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
