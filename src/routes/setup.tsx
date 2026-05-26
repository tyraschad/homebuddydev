import { createFileRoute, redirect } from "@tanstack/react-router";

// /setup is an alias for /onboarding.
export const Route = createFileRoute("/setup")({
  beforeLoad: () => { throw redirect({ to: "/onboarding" }); },
});
