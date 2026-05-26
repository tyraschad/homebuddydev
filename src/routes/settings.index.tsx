import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Palette, Type, Volume2, Contrast, Check } from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/lib/settings-store";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Albert" }] }),
});

const GREEN = "#2F8F4E";

function SettingsPage() {
  const { theme, appearance, setAppearance, textSize, setTextSize, highContrast, setHighContrast, announcementsEnabled, setAnnouncementsEnabled, cardBorder } = useSettings();




  const tileStyle: React.CSSProperties = {
    background: theme.card,
    border: cardBorder,
    borderRadius: 8,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    color: theme.text,
    fontFamily: "inherit",
    lineHeight: 1.5,
    textDecoration: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontFamily: "'Trebuchet MS', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: theme.text,
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
          to="/elder"
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
        <Link
          to="/carer"
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
        </Link>
      </header>

      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: theme.card,
            border: cardBorder,
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
        <div style={tileStyle}>
          <Palette size={20} strokeWidth={2} color={theme.text} />
          <span style={labelStyle}>Appearance</span>
          <Segment
            leftLabel="Light"
            rightLabel="Dark"
            isRight={appearance === "dark"}
            onChange={(r) => setAppearance(r ? "dark" : "light")}
            theme={theme}
          />
        </div>

        <div style={tileStyle}>
          <Type size={20} strokeWidth={2} color={theme.text} />
          <span style={labelStyle}>Text size</span>
          <Segment
            leftLabel="M"
            rightLabel="L"
            isRight={textSize === "large"}
            onChange={(r) => setTextSize(r ? "large" : "medium")}
            theme={theme}
          />
        </div>

        <button type="button" onClick={() => setTts((v) => !v)} style={{ ...tileStyle, cursor: "pointer" }} aria-pressed={tts}>
          <Volume2 size={20} strokeWidth={2} color={theme.text} />
          <span style={labelStyle}>Text to speech</span>
          <ToggleDot on={tts} />
        </button>

        <button type="button" onClick={() => setHighContrast(!highContrast)} style={{ ...tileStyle, cursor: "pointer" }} aria-pressed={highContrast}>
          <Contrast size={20} strokeWidth={2} color={theme.text} />
          <span style={labelStyle}>High contrast mode</span>
          <ToggleDot on={highContrast} />
        </button>
      </div>
    </main>
  );
}

function Segment({
  leftLabel,
  rightLabel,
  isRight,
  onChange,
  theme,
}: {
  leftLabel: string;
  rightLabel: string;
  isRight: boolean;
  onChange: (right: boolean) => void;
  theme: { bg: string; card: string; text: string; border: string };
}) {
  const { buttonBorder } = useSettings();
  const width = 140;
  const height = 40;
  const halfW = width / 2;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!isRight); }}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 12,
        background: theme.bg,
        border: buttonBorder,
        padding: 3,
        cursor: "pointer",
        flexShrink: 0,
      }}
      aria-pressed={isRight}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: isRight ? halfW : 3,
          width: halfW - 3,
          height: height - 6,
          borderRadius: 9,
          background: theme.text,
          transition: "left 200ms ease",
        }}
      />
      <span
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          height: "100%",
          fontFamily: "'Trebuchet MS', sans-serif",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: isRight ? theme.text : theme.card }}>
          {leftLabel}
        </span>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: isRight ? theme.card : theme.text }}>
          {rightLabel}
        </span>
      </span>
    </button>
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
