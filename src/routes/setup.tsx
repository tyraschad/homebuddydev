import { createFileRoute } from "@tanstack/react-router";
import { Route as OnboardingRoute } from "./onboarding";

// /setup is an alias for /onboarding using the same component.
export const Route = createFileRoute("/setup")({
  component: OnboardingRoute.options.component!,
  head: () => ({ meta: [{ title: "HomeBuddy Setup" }] }),
});
