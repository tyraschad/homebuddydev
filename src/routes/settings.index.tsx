import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Palette, Type, Volume2, Contrast, ChevronRight, Check } from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/lib/settings-store";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings — Albert" }],
  }),
});

const GREEN = "#2F8F4E";

function SettingsPage() {
  const { theme, appearance, textSize } = useSettings();
  const [tts, setTts] = useState(false);
  const [hc, setHc] = useState(true);

  const tileStyle: React.CSSProperties = {
    background: theme.card,
    border: `1.5px solid ${theme.border}`,
    borderRadius: 8,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    color: theme.text,
    fontFamily: "inherit",
    lineHeight: 1.5,
    textDecoration: "none",
  };

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: theme.bg,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        color: theme.text,
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          background: theme.bg,
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
            color: theme.text,
            textDecoration: "none",
            fontFamily: "Verdana, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            justifySelf: "start",
          }}
        >
          <ArrowLeft size={24} strokeWidth={2} color={theme.text} />
          <span>Back</span>
        </Link>
        <h1
          style={{
            margin: 0,
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 32,
            color: theme.text,
            textAlign: "center",
          }}
        >
          Settings
        </h1>
        <button
          type="button"
          style={{
            justifySelf: "end",
            background: "transparent",
            color: theme.text,
            border: "none",
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Open Carer Portal
        </button>
      </header>

      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.border}`,
            borderRadius: 8,
            padding: 16,
            fontFamily: "Verdana, sans-serif",
            fontSize: 18,
            color: theme.text,
            textAlign: "center",
          }}
        >
          These settings only affect the Elder screens and do not change the Carer Portal.
        </div>
      </div>

      <div
        style={{
          padding: "0 16px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <Link to="/settings/appearance" style={tileStyle}>
          <Palette size={20} strokeWidth={2} color={theme.text} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text }}>
              Appearance
            </span>
            <span style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted }}>
              {appearance === "dark" ? "Dark" : "Light"}
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={2} color={theme.text} />
        </Link>

        <Link to="/settings/text-size" style={tileStyle}>
          <Type size={20} strokeWidth={2} color={theme.text} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text }}>
              Text size
            </span>
            <span style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted }}>
              {textSize === "large" ? "Large" : "Medium"}
            </span>
          </div>
          <ChevronRight size={16} strokeWidth={2} color={theme.text} />
        </Link>

        <button type="button" onClick={() => setTts((v) => !v)} style={tileStyle} aria-pressed={tts}>
          <Volume2 size={20} strokeWidth={2} color={theme.text} />
          <span style={{ flex: 1, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text }}>
            Text to speech
          </span>
          <ToggleDot on={tts} />
        </button>

        <button type="button" onClick={() => setHc((v) => !v)} style={tileStyle} aria-pressed={hc}>
          <Contrast size={20} strokeWidth={2} color={theme.text} />
          <span style={{ flex: 1, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text }}>
            High contrast mode
          </span>
          <ToggleDot on={hc} />
        </button>
      </div>
    </main>
  );
}

function ToggleDot({ on }: { on: boolean }) {
  return (
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
  );
}
