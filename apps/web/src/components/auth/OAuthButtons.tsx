import { Button } from "@/components/ui/button";

/*
  Social sign-in. These are plain links, not fetches — the whole point is to
  hand the browser to the provider and come back, which XHR cannot do.

  A provider only appears when the server actually has credentials for it, so
  nobody is offered a button that dead-ends. `next` rides along so people land
  back where they were rather than on the map every time.
*/

type Provider = { key: "google" | "linkedin"; label: string; mark: React.ReactNode };

/*
  Provider marks are the one place raw hex is allowed. These are other
  companies' trademarks with fixed colours, not Atlas design tokens, and
  recolouring them to the brand palette is against both providers' guidelines.
*/
const GoogleMark = (
  <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
    <title>Google</title>
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.32Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

const LinkedInMark = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <title>LinkedIn</title>
    <path
      fill="#0A66C2"
      d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
    />
  </svg>
);

const PROVIDERS: Provider[] = [
  { key: "google", label: "Continue with Google", mark: GoogleMark },
  { key: "linkedin", label: "Continue with LinkedIn", mark: LinkedInMark },
];

export function OAuthButtons({
  available,
  next,
}: {
  available: { google: boolean; linkedin: boolean };
  next?: string;
}) {
  const usable = PROVIDERS.filter((provider) => available[provider.key]);
  if (usable.length === 0) return null;

  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {usable.map((provider) => (
          <Button key={provider.key} asChild variant="outline" className="w-full">
            <a href={`/api/auth/${provider.key}${suffix}`}>
              {provider.mark}
              {provider.label}
            </a>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

/* Turns the ?error= the OAuth callback sends back into something readable. */
export function oauthErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  switch (code) {
    case "cancelled":
      return undefined; // They chose not to. Saying anything would be nagging.
    case "provider_unavailable":
      return "That sign-in option is not set up on this server. Use email and password.";
    case "email_unverified":
      return "That account's email is not verified with the provider yet.";
    case "expired":
      return "That sign-in attempt timed out. Try once more.";
    default:
      return "That sign-in did not go through. Try again.";
  }
}
