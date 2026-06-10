import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Accessibility, Moon, Volume2, Type } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { useSettings } from "@/lib/settings-store";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings" }] }),
});

const PAGE_BG = "#8F8F8F";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREEN = "#6BA24A";
const OFF_GRAY = "#CCCCCC";
const PORTAL_BTN_BG = "#A8A8A8";

function SettingsPage() {
  const navigate = useNavigate();
  const {
    appearance,
    setAppearance,
    highContrast,
    setHighContrast,
    announcementsEnabled,
    setAnnouncementsEnabled,
  } = useSettings();

  const [textReader, setTextReader] = useState<boolean>(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem("textReader");
      if (v === "true" || v === "false") setTextReader(v === "true");
    } catch {}
  }, []);
  const toggleTextReader = () => {
    const next = !textReader;
    setTextReader(next);
    try { localStorage.setItem("textReader", String(next)); } catch {}
  };

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: PAGE_BG,
        boxSizing: "border-box",
        color: WHITE,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "32px 48px",
      }}
    >
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
          marginBottom: 64,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/elder" })}
          style={{
            justifySelf: "start",
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: WHITE,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: `2px solid ${WHITE}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} color={WHITE} />
          </span>
          <span>Back</span>
        </button>

        <h1
          style={{
            margin: 0,
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontWeight: 400,
            fontSize: 44,
            color: WHITE,
            textAlign: "center",
            letterSpacing: 0.5,
          }}
        >
          Settings
        </h1>

        <button
          type="button"
          onClick={() => navigate({ to: "/carer" })}
          style={{
            justifySelf: "end",
            background: PORTAL_BTN_BG,
            color: WHITE,
            border: "none",
            borderRadius: 10,
            padding: "14px 24px",
            cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          Open Carer Portal
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <SettingCard
          icon={<Accessibility size={32} strokeWidth={2} color={BLACK} />}
          label="Accessible Visuals"
          on={highContrast}
          onToggle={() => setHighContrast(!highContrast)}
        />
        <SettingCard
          icon={<Moon size={32} strokeWidth={2} color={BLACK} fill={BLACK} />}
          label="Dark Mode"
          on={appearance === "dark"}
          onToggle={() => setAppearance(appearance === "dark" ? "light" : "dark")}
        />
        <SettingCard
          icon={<Volume2 size={32} strokeWidth={2} color={BLACK} />}
          label="Reminder Announcments"
          on={announcementsEnabled}
          onToggle={() => setAnnouncementsEnabled(!announcementsEnabled)}
        />
        <SettingCard
          icon={<Type size={32} strokeWidth={2} color={BLACK} />}
          label="Text Reader"
          on={textReader}
          onToggle={toggleTextReader}
        />
      </div>
    </main>
  );
}

function SettingCard({
  icon,
  label,
  on,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  const card: CSSProperties = {
    background: WHITE,
    border: "none",
    borderRadius: 16,
    padding: "28px 32px",
    minHeight: 96,
    display: "flex",
    alignItems: "center",
    gap: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "Inter, system-ui, sans-serif",
    color: BLACK,
    textAlign: "left",
  };
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} style={card}>
      <span style={{ flexShrink: 0, display: "inline-flex", width: 40, justifyContent: "center" }}>{icon}</span>
      <span
        style={{
          flex: 1,
          fontWeight: 700,
          fontSize: 22,
          color: BLACK,
        }}
      >
        {label}
      </span>
      <Toggle on={on} />
    </button>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: 64,
        height: 32,
        borderRadius: 16,
        background: on ? GREEN : OFF_GRAY,
        transition: "background 0.3s ease",
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 34 : 3,
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: WHITE,
          transition: "left 0.3s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </span>
  );
}
