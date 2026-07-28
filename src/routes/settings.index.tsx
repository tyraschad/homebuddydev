import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Accessibility, Volume2, Type } from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";

import { useSettings } from "@/lib/settings-store";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings" }] }),
});

const PAGE_BG = "#25483A";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
const GREEN = "#6BA24A";
const OFF_GRAY = "#CCCCCC";
const PORTAL_BTN_BG = "#F0F0F0";
const CARD_BORDER = "#E5E5E5";

function SettingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    highContrast,
    setHighContrast,
    announcementsEnabled,
    setAnnouncementsEnabled,
    textReader,
    setTextReader,
  } = useSettings();
  const toggleTextReader = () => setTextReader(!textReader);

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: PAGE_BG,
        boxSizing: "border-box",
        color: BLACK,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: isMobile ? 8 : 16,
          padding: isMobile ? "12px" : "16px",
          minHeight: 60,
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/elder" })}
          aria-label="Back to elder screen"
          style={{
            justifySelf: "start",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: WHITE,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          <ArrowLeft size={24} strokeWidth={2.5} color={WHITE} />
          {!isMobile && <span data-readable="true">Back to elder screen</span>}
        </button>

        <h1
          data-readable="true"
          style={{
            margin: 0,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 22 : 28,
            color: WHITE,
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
            background: PORTAL_BTN_BG,
            color: BLACK,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 8,
            padding: isMobile ? "8px 12px" : "12px 16px",
            cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 14 : 16,
            whiteSpace: "nowrap",
          }}
        >
          {isMobile ? "Carer Portal" : "Open Carer Portal"}
        </button>
      </header>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <SettingCard
          icon={<Accessibility size={24} strokeWidth={2} color={BLACK} />}
          label="Accessible Visuals"
          on={highContrast}
          onToggle={() => setHighContrast(!highContrast)}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <SettingCard
            icon={<Volume2 size={24} strokeWidth={2} color={BLACK} />}
            label="Reminder Announcements"
            on={announcementsEnabled}
            onToggle={() => setAnnouncementsEnabled(!announcementsEnabled)}
          />
          <SettingCard
            icon={<Type size={24} strokeWidth={2} color={BLACK} />}
            label="Text Reader"
            on={textReader}
            onToggle={toggleTextReader}
          />
        </div>
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
    border: `1px solid ${CARD_BORDER}`,
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
    color: BLACK,
    textAlign: "left",
  };
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} style={card}>
      <span style={{ flexShrink: 0, display: "inline-flex" }}>{icon}</span>
      <span data-readable="true" style={{ flex: 1, fontWeight: 700, fontSize: 18, color: BLACK }}>{label}</span>
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
          background: WHITE,
          transition: "left 0.3s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </span>
  );
}
