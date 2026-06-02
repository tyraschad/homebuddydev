import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, PlayCircle } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useSettings } from "@/lib/settings-store";
import { useCarer } from "@/lib/carer-store";
import { clearTour } from "@/components/portal-tour";

const GREEN = "#2F8F4E";
const RED = "#C0392B";
const ONB_KEY = "homebuddy.onboarding.v2";

export const Route = createFileRoute("/carer/settings")({
  component: CarerSettings,
  head: () => ({ meta: [{ title: "Carer Portal — Settings" }] }),
});

function CarerSettings() {
  const { theme, cardBorder, buttonBorder, carerAppearance, setCarerAppearance } = useSettings();
  const { resetAll } = useCarer();
  const navigate = useNavigate();
  const [onbStep, setOnbStep] = useState<number | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.step === "number" && parsed.step < 10) setOnbStep(parsed.step);
      }
    } catch {}
  }, []);

  const card: CSSProperties = {
    background: theme.card, border: cardBorder, borderRadius: 8,
    padding: 20, margin: 16,
  };
  const btnOutline: CSSProperties = {
    background: "transparent", color: theme.text, border: buttonBorder,
    height: 44, padding: "0 18px", borderRadius: 8, cursor: "pointer",
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    textDecoration: "none", width: "100%",
  };

  const handleRestart = () => {
    resetAll();
    setConfirmRestart(false);
    navigate({ to: "/onboarding" });
  };

  const handleTakeTour = () => {
    clearTour();
    navigate({ to: "/carer" });
  };

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: "Verdana, sans-serif", lineHeight: 1.5 }}>
      <header style={{
        padding: 16, display: "flex", alignItems: "center", gap: 12,
        borderBottom: cardBorder,
      }}>
        <Link to="/carer" style={{ ...btnOutline, width: "auto" }}>
          <ArrowLeft size={18} /> Back to portal
        </Link>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 24, color: theme.text }}>
          Carer Portal Settings
        </h1>
      </header>

      <section style={card}>
        <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>Setup</h2>
        <p style={{ color: theme.muted, fontSize: 14, marginTop: 6 }}>
          Resume or restart the initial onboarding flow.
        </p>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {onbStep !== null && (
            <Link to="/onboarding" style={btnOutline}>
              Back to setup (resume at page {onbStep})
            </Link>
          )}
          <button type="button" onClick={() => setConfirmRestart(true)} style={btnOutline}>
            <RotateCcw size={16} /> Restart setup
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>Tour</h2>
        <p style={{ color: theme.muted, fontSize: 14, marginTop: 6 }}>
          Show the carer portal walkthrough again.
        </p>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleTakeTour} style={btnOutline}>
            <PlayCircle size={16} /> Take tour
          </button>
        </div>
      </section>

      {confirmRestart && (
        <div onClick={() => setConfirmRestart(false)} role="dialog" aria-modal="true" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: theme.card, color: theme.text, border: cardBorder, borderRadius: 8,
            padding: 24, width: "100%", maxWidth: 460,
          }}>
            <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>
              Clear all setup data and start over?
            </h3>
            <p style={{ color: theme.muted, fontSize: 14, marginTop: 8 }}>
              This deletes the elder profile, reminders, devices, and contacts you've entered. This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setConfirmRestart(false)} style={btnOutline}>Cancel</button>
              <button type="button" onClick={handleRestart} style={{
                background: RED, color: "#fff", border: "none", height: 44, padding: "0 18px",
                borderRadius: 8, cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700, fontSize: 14,
              }}>Yes, restart</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
