import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Palette, Type, Volume2, Contrast, ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings — Albert" }],
  }),
});

const INK = "#1A1A2E";
const MUTED = "#6B6860";
const GREEN = "#2F8F4E";
const BG = "#F2F2EF";

function SettingsPage() {
  const [tts, setTts] = useState(false);
  const [hc, setHc] = useState(true);

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        color: INK,
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: BG,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: INK,
            textDecoration: "none",
            fontFamily: "Verdana, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            justifySelf: "start",
          }}
        >
          <ArrowLeft size={24} strokeWidth={2} color={INK} />
          <span>Back</span>
        </Link>
        <h1
          style={{
            margin: 0,
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 32,
            color: INK,
            textAlign: "center",
          }}
        >
          Settings
        </h1>
        <button
          type="button"
          style={{
            justifySelf: "end",
            minWidth: 200,
            height: 44,
            borderRadius: 999,
            background: GREEN,
            color: "#FFFFFF",
            border: "none",
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            padding: "0 20px",
          }}
        >
          Open Carer Portal
        </button>
      </header>

      {/* Disclaimer */}
      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: "#FFFFFF",
            border: `1.5px solid ${INK}`,
            borderRadius: 8,
            padding: 16,
            fontFamily: "Verdana, sans-serif",
            fontSize: 18,
            color: INK,
            textAlign: "center",
          }}
        >
          These settings only affect the Elder screens and do not change the Carer Portal.
        </div>
      </div>

      {/* Tiles grid */}
      <div
        style={{
          padding: "0 16px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <MenuTile icon={<Palette size={20} strokeWidth={2} color={INK} />} label="Appearance" value="Light" />
        <MenuTile icon={<Type size={20} strokeWidth={2} color={INK} />} label="Text size" value="Medium" />
        <ToggleTile
          icon={<Volume2 size={20} strokeWidth={2} color={INK} />}
          label="Text to speech"
          on={tts}
          onChange={() => setTts((v) => !v)}
        />
        <ToggleTile
          icon={<Contrast size={20} strokeWidth={2} color={INK} />}
          label="High contrast mode"
          on={hc}
          onChange={() => setHc((v) => !v)}
        />
      </div>
    </main>
  );
}

const tileStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1.5px solid ${INK}`,
  borderRadius: 8,
  padding: 20,
  display: "flex",
  alignItems: "center",
  gap: 16,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  color: INK,
  fontFamily: "inherit",
  lineHeight: 1.5,
};

function MenuTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <button type="button" style={tileStyle}>
      {icon}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: INK,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "Verdana, sans-serif",
            fontSize: 14,
            color: MUTED,
          }}
        >
          {value}
        </span>
      </div>
      <ChevronRight size={16} strokeWidth={2} color={INK} />
    </button>
  );
}

function ToggleTile({
  icon,
  label,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button type="button" onClick={onChange} style={tileStyle} aria-pressed={on}>
      {icon}
      <span
        style={{
          flex: 1,
          fontFamily: "'Trebuchet MS', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: INK,
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 50,
          height: 28,
          borderRadius: 14,
          background: on ? GREEN : "#C9C7C0",
          transition: "background 150ms ease",
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
            transition: "left 150ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {on && <Check size={14} strokeWidth={3} color={GREEN} />}
        </span>
      </span>
    </button>
  );
}
