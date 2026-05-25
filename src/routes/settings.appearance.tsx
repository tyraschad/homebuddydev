import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSettings } from "@/lib/settings-store";

export const Route = createFileRoute("/settings/appearance")({
  component: AppearancePage,
  head: () => ({ meta: [{ title: "Appearance — Settings" }] }),
});

function AppearancePage() {
  const { theme, appearance, setAppearance } = useSettings();
  const isDark = appearance === "dark";

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
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
          to="/settings"
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
          Appearance
        </h1>
        <span />
      </header>

      <div style={{ padding: "0 16px 16px" }}>
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.border}`,
            borderRadius: 8,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color: theme.text,
          }}
        >
          <div
            style={{
              fontFamily: "Verdana, sans-serif",
              fontSize: 18,
              color: theme.muted,
              marginBottom: 20,
            }}
          >
            Choose your theme
          </div>
          <SegmentToggle
            leftLabel="Light"
            rightLabel="Dark"
            isRight={isDark}
            onChange={(right) => setAppearance(right ? "dark" : "light")}
            theme={theme}
          />
        </div>
      </div>
    </main>
  );
}

function SegmentToggle({
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
  const width = 220;
  const height = 56;
  const halfW = width / 2;
  return (
    <button
      type="button"
      onClick={() => onChange(!isRight)}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 16,
        background: theme.bg,
        border: `1.5px solid ${theme.border}`,
        padding: 4,
        cursor: "pointer",
        display: "block",
      }}
      aria-pressed={isRight}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: isRight ? halfW : 4,
          width: halfW - 4,
          height: height - 8,
          borderRadius: 12,
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
          fontSize: 16,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isRight ? theme.text : theme.card,
            transition: "color 200ms ease",
          }}
        >
          {leftLabel}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isRight ? theme.card : theme.text,
            transition: "color 200ms ease",
          }}
        >
          {rightLabel}
        </span>
      </span>
    </button>
  );
}
