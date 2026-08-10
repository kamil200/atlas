/*
  `next` carries someone back to whatever they were doing when we asked them to
  sign in. It arrives as a whole href — "/map?companySlug=zerodha&city=Pune" —
  but the router reads `to` as a pathname alone, so handing it the full string
  made it look for a route literally named "/map?companySlug=zerodha" and drop
  the visitor on the 404 page instead. Splitting it fixes that.

  Repeated keys stay arrays, because "?city=Mumbai&city=Pune" is two cities and
  collapsing it to one would silently narrow the filters someone came back to.
*/

type NextLocation = {
  to: string;
  search: Record<string, string | string[]>;
};

const FALLBACK: NextLocation = { to: "/map", search: {} };

export function parseNext(next: string | undefined): NextLocation {
  /*
    Only same-site paths are followed. Without this a crafted
    "?next=https://example.com" link would bounce someone off the site the
    moment they signed in, which is an open redirect.
  */
  if (!next?.startsWith("/") || next.startsWith("//")) return FALLBACK;

  const [pathname, query] = next.split("?");
  if (!pathname) return FALLBACK;

  const params = new URLSearchParams(query ?? "");
  const search: Record<string, string | string[]> = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    const value = values.length > 1 ? values : values[0];
    if (value !== undefined) search[key] = value;
  }

  return { to: pathname, search };
}
