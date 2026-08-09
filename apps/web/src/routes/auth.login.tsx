import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, AuthSubmitError } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/store/api/auth-api";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
  // `next` remembers where someone was when we asked them to sign in. It is
  // returned only when present, so links elsewhere do not have to pass it.
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" ? { next: search.next } : {},
});

function LoginPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    try {
      await login({ email, password }).unwrap();
      navigate({ to: next ?? "/map" });
    } catch (caught) {
      setError((caught as { message?: string }).message ?? "That did not work. Try again.");
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link to="/auth/register" className="font-medium text-peepal-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <AuthSubmitError message={error} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 rounded-md border border-line bg-paper-2 px-3 py-2 text-xs text-ink-soft">
        Demo account: <span className="font-mono">demo@chowk.dev</span> /{" "}
        <span className="font-mono">Password123!</span>
      </p>
    </AuthShell>
  );
}
