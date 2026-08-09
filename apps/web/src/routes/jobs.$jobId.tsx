import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/jobs/$jobId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/map", search: { jobId: params.jobId } });
  },
});
