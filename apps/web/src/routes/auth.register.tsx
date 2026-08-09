import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, AuthSubmitError } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterMutation } from "@/store/api/auth-api";

export const Route = createFileRoute("/auth/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (password.length < 8) {
      setError("Use at least eight characters.");
      return;
    }
    try {
      await register({ name, email, password }).unwrap();
      navigate({ to: "/map" });
    } catch (caught) {
      setError((caught as { message?: string }).message ?? "That did not work. Try again.");
    }
  };

  return (
    <AuthShell
      title="Make an account"
      subtitle="Save roles, track applications, apply in one place."
      footer={
        <>
          Already have one?{" "}
          <Link to="/auth/login" className="font-medium text-peepal-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-ink-soft">At least eight characters.</p>
        </div>

        <AuthSubmitError message={error} />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
