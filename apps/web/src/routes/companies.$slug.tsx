import { createFileRoute, redirect } from "@tanstack/react-router";

/*
  A shareable company link. It redirects onto the map with the sidebar open,
  so a deep link lands you in the product rather than on a dead-end page.
*/
export const Route = createFileRoute("/companies/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/map", search: { companySlug: params.slug } });
  },
});
