import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/shared/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="grid h-full place-items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-block">
          <Wordmark />
        </Link>

        <h1 className="font-display mt-8 text-4xl leading-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>

        <div className="mt-7">{children}</div>

        <p className="mt-6 text-sm text-ink-soft">{footer}</p>
      </div>
    </main>
  );
}

/* Errors stay plain and specific — no exclamation marks, no emoji (BRAND §6). */
export function AuthSubmitError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}
