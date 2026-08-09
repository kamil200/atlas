import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useCurrentUser } from "@/hooks/use-current-user";

/*
  Where Google sign-in lands once phase 3b ships. It already handles the
  error the server sends when an email is registered with a password, because
  accounts are never merged silently.
*/
export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
  validateSearch: (search: Record<string, unknown>): { error?: string } =>
    typeof search.error === "string" ? { error: search.error } : {},
});

function CallbackPage() {
  const { error } = Route.useSearch();
  const { isAuthenticated, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!error && isAuthenticated) navigate({ to: "/map" });
  }, [error, isAuthenticated, navigate]);

  if (error === "use_password_login") {
    return (
      <AuthShell
        title="This email uses a password"
        subtitle="Sign in with your email and password instead."
        footer={
          <Link to="/auth/login" className="font-medium text-peepal-700 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-ink-soft">
          We never merge a Google account into an existing one automatically.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Signing you in"
      subtitle={isLoading ? "One moment." : "Almost there."}
      footer={
        <Link to="/auth/login" className="font-medium text-peepal-700 hover:underline">
          Having trouble? Sign in with a password
        </Link>
      }
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-peepal-600" />
      </div>
    </AuthShell>
  );
}
