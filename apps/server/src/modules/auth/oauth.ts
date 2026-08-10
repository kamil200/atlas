import type { AppConfig } from "../../plugins/env";

/*
  Google and LinkedIn sign-in.

  Both speak OpenID Connect, so after the token exchange they answer the same
  userinfo shape and one code path handles both. The only per-provider parts are
  the three URLs, the scope string, and the credentials.

  Neither provider can be configured from inside this repo, so a provider with
  no client id is simply "not configured" — the routes say so plainly and the
  sign-in page hides its button, rather than showing one that dead-ends.
*/

export const OAUTH_PROVIDERS = ["google", "linkedin"] as const;
export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

export type OAuthProfile = {
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
};

type ProviderEndpoints = {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
};

const ENDPOINTS: Record<OAuthProviderName, ProviderEndpoints> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    scope: "openid profile email",
  },
};

type Credentials = { clientId: string; clientSecret: string; redirectUri: string };

function credentialsFor(config: AppConfig, provider: OAuthProviderName): Credentials {
  return provider === "google"
    ? {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        redirectUri: config.GOOGLE_REDIRECT_URI,
      }
    : {
        clientId: config.LINKEDIN_CLIENT_ID,
        clientSecret: config.LINKEDIN_CLIENT_SECRET,
        redirectUri: config.LINKEDIN_REDIRECT_URI,
      };
}

/** True when this server has credentials for the provider. */
export function isConfigured(config: AppConfig, provider: OAuthProviderName): boolean {
  const { clientId, clientSecret } = credentialsFor(config, provider);
  return clientId.length > 0 && clientSecret.length > 0;
}

export function configuredProviders(config: AppConfig): Record<OAuthProviderName, boolean> {
  return {
    google: isConfigured(config, "google"),
    linkedin: isConfigured(config, "linkedin"),
  };
}

/** Where to send the browser to start the consent screen. */
export function authorizeUrl(
  config: AppConfig,
  provider: OAuthProviderName,
  state: string,
): string {
  const { clientId, redirectUri } = credentialsFor(config, provider);
  const endpoints = ENDPOINTS[provider];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: endpoints.scope,
    state,
  });

  /*
    Google returns a refresh token only when asked, and re-prompts only when
    told to. We want neither — this is sign-in, not ongoing API access — so it
    stays a plain consent round trip.
  */
  if (provider === "google") params.set("prompt", "select_account");

  return `${endpoints.authorizeUrl}?${params.toString()}`;
}

type TokenResponse = { access_token?: string };

/*
  Trades the one-time code for an access token, then reads the profile.
  Throws on any non-2xx so the callback route can fail as one case.
*/
export async function fetchProfile(
  config: AppConfig,
  provider: OAuthProviderName,
  code: string,
): Promise<OAuthProfile> {
  const { clientId, clientSecret, redirectUri } = credentialsFor(config, provider);
  const endpoints = ENDPOINTS[provider];

  const tokenResponse = await fetch(endpoints.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`${provider} token exchange failed with ${tokenResponse.status}`);
  }

  const token = (await tokenResponse.json()) as TokenResponse;
  if (!token.access_token) throw new Error(`${provider} returned no access token`);

  const userResponse = await fetch(endpoints.userInfoUrl, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error(`${provider} userinfo failed with ${userResponse.status}`);
  }

  return toProfile(provider, await userResponse.json());
}

/* OIDC userinfo. Only `sub` is guaranteed; everything else is checked. */
type UserInfo = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  given_name?: unknown;
  picture?: unknown;
};

function toProfile(provider: OAuthProviderName, raw: unknown): OAuthProfile {
  const info = (raw ?? {}) as UserInfo;

  const providerId = typeof info.sub === "string" ? info.sub : "";
  const email = typeof info.email === "string" ? info.email.trim().toLowerCase() : "";
  if (!providerId || !email) {
    throw new Error(`${provider} did not return an id and an email`);
  }

  const name =
    (typeof info.name === "string" && info.name.trim()) ||
    (typeof info.given_name === "string" && info.given_name.trim()) ||
    email.split("@")[0] ||
    "There";

  return {
    providerId,
    email,
    /*
      Both providers send email_verified. Treat a missing flag as unverified:
      accounts are linked by email, so trusting an unverified address would let
      someone claim an account by signing up elsewhere with the same address.
    */
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name,
    avatarUrl: typeof info.picture === "string" ? info.picture : null,
  };
}
