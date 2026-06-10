import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Accessibility, Moon, Volume2, Type } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { useSettings } from "@/lib/settings-store";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Albert" }] }),
});

const PAGE_BG = "#8F8F8F";
const HEADER_BG = "#8F8F8F";
const GREEN = "#6BA24A";
const OFF_GRAY = "#CCCCCC";
const TEXT = "#000000";

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
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        color: TEXT,
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: 1.4,
      }}
    >
      <header
        style={{
          background: HEADER_BG,
          minHeight: 60,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/elder" })}
          style={{
            justifySelf: "start",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: TEXT,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          <ArrowLeft size={24} strokeWidth={2.5} color={TEXT} />
          <span>Back to elder screen</span>
        </button>

        <h1
          style={{
            margin: 0,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: TEXT,
            textAlign: "center",
          }}
        >
          Settings
        </h1>

        <button
          type="button"
          onClick={() => navigate({ to: "/carer" })}
          style={{
            justifySelf: "end",
            background: "#F0F0F0",
            color: TEXT,
            border: "1px solid #D9D9D9",
            borderRadius: 8,
            padding: "12px 16px",
            cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Open Carer Portal
        </button>
      </header>

      <div
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <SettingCard
          icon={<Accessibility size={24} strokeWidth={2} color={TEXT} />}
          label="Accessible Visuals"
          on={highContrast}
          onToggle={() => setHighContrast(!highContrast)}
        />
        <SettingCard
          icon={<Moon size={24} strokeWidth={2} color={TEXT} />}
          label="Dark Mode"
          on={appearance === "dark"}
          onToggle={() => setAppearance(appearance === "dark" ? "light" : "dark")}
        />
        <SettingCard
          icon={<Volume2 size={24} strokeWidth={2} color={TEXT} />}
          label="Reminder Announcements"
          on={announcementsEnabled}
          onToggle={() => setAnnouncementsEnabled(!announcementsEnabled)}
        />
        <SettingCard
          icon={<Type size={24} strokeWidth={2} color={TEXT} />}
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
    background: "#FFFFFF",
    border: "1px solid #E0E0E0",
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "Inter, system-ui, sans-serif",
    color: TEXT,
    textAlign: "left",
  };
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} style={card}>
      <span style={{ flexShrink: 0, display: "inline-flex" }}>{icon}</span>
      <span
        style={{
          flex: 1,
          fontWeight: 700,
          fontSize: 18,
          color: TEXT,
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
        width: 50,
        height: 28,
        borderRadius: 14,
        background: on ? GREEN : OFF_GRAY,
        transition: "background 0.3s ease",
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 24 : 2,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 0.3s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </span>
  );
}
