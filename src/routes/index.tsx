import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const ONBOARDING_COMPLETE_KEY = "homebuddy.onboarding.completed.v1";

export const Route = createFileRoute("/")({
  component: RootRedirect,
  head: () => ({
    meta: [{ title: "HomeBuddy" }],
  }),
});

function RootRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let complete = false;
    try {
      complete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1";
    } catch {}
    navigate({ to: complete ? "/carer" : "/setup", replace: true });
  }, [navigate]);
  return null;
}
