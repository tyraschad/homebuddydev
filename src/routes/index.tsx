import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Mic, Phone, X } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { TalkToTextPopup } from "@/components/TalkToTextPopup";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Albert's Home" },
      { name: "description", content: "Albert's simple home screen." },
    ],
  }),
});

type Overlay = "chat" | "call" | null;

function ordinalSuffix(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function formatDateDay(d: Date) {
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = d.toLocaleDateString("en-US", { month: "long" });
  const date = d.getDate();
  return `${dayName}, ${monthName} ${ordinalSuffix(date)}`;
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Index() {
  const { theme, sizes, textSize } = useSettings();
  const [now, setNow] = useState<Date | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(t);
  }, []);

  const dateDayStr = now ? formatDateDay(now) : "";
  const timeStr = now ? formatTime(now) : "";
  const greet = now ? greeting(now) : "Hello";

  const line1Size = textSize === "large" ? 34 : 28;
  const line2Size = textSize === "large" ? 53 : 44;

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        background: theme.bg,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        color: theme.text,
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: theme.text,
            margin: 0,
          }}
        >
          {greet}, Albert
        </h1>
        <Link
          to="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: theme.text,
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <Settings size={24} strokeWidth={1.5} color={theme.text} />
          <span>Settings</span>
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", gap: 16, overflow: "hidden" }}>
        <Column width="50%">
          <CardBox height="calc(30% - 8px)" padding={16} center theme={theme}>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: sizes.date, color: theme.muted }}>
              {dateStr}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                fontSize: sizes.day,
                color: theme.text,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              {dayStr}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                fontSize: sizes.time,
                color: theme.text,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {timeStr}
            </div>
          </CardBox>

          <CardBox onClick={() => setOverlay("chat")} height="calc(70% - 8px)" padding={30} theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, height: "100%", width: "100%" }}>
              <Mic size={90} strokeWidth={2} color={theme.text} />
              <div
                style={{
                  fontFamily: "'Trebuchet MS', sans-serif",
                  fontWeight: 700,
                  fontSize: 24,
                  color: theme.text,
                  textAlign: "center",
                }}
              >
                Tap to Ask a Question
              </div>
            </div>
          </CardBox>

        </Column>

        <Column width="50%">
          <CardBox height="calc(55% - 8px)" padding={20} theme={theme}>
            <h2
              style={{
                fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700,
                fontSize: sizes.heading,
                color: theme.text,
                margin: 0,
              }}
            >
              Today's Reminders
            </h2>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p
                style={{
                  fontFamily: "Verdana, sans-serif",
                  fontSize: sizes.body,
                  color: theme.text,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                You're all clear for today
              </p>
            </div>
          </CardBox>

          <CardBox onClick={() => setOverlay("call")} height="calc(45% - 8px)" padding={20} theme={theme}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                height: "100%",
              }}
            >
              <Phone size={50} strokeWidth={2} color={theme.text} />
              <div
                style={{
                  fontFamily: "'Trebuchet MS', sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: theme.text,
                }}
              >
                Make a call
              </div>
            </div>
          </CardBox>
        </Column>
      </div>

      {overlay === "chat" && <TalkToTextPopup onClose={() => setOverlay(null)} />}

      {overlay === "call" && (
        <OverlayView title="Make a Call" onClose={() => setOverlay(null)} theme={theme}>
          <div style={{ flex: 1, minHeight: 200 }} />
        </OverlayView>
      )}
    </main>
  );
}

function Column({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
      {children}
    </div>
  );
}

function CardBox({
  children,
  onClick,
  height = "48%",
  padding = 20,
  center = false,
  theme,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  height?: string;
  padding?: number;
  center?: boolean;
  theme: { bg: string; card: string; text: string; border: string };
}) {
  const { cardBorder } = useSettings();
  const style: React.CSSProperties = {
    height,
    flexShrink: 0,
    overflow: "hidden",
    background: theme.card,
    border: cardBorder,
    borderRadius: 8,
    padding,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    textAlign: center ? "center" : "left",
    alignItems: center ? "center" : undefined,
    justifyContent: center ? "center" : undefined,
    cursor: onClick ? "pointer" : "default",
    color: theme.text,
    fontFamily: "inherit",
    width: "100%",
  };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style}>
        {children}
      </button>
    );
  }
  return <div style={style}>{children}</div>;
}

function ActionBtn({
  children,
  theme,
  fontSize,
}: {
  children: React.ReactNode;
  theme: { card: string; text: string; border: string };
  fontSize: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      style={{
        fontFamily: "'Trebuchet MS', sans-serif",
        fontWeight: 700,
        fontSize,
        color: theme.text,
        background: theme.card,
        border: `1.5px solid ${theme.border}`,
        borderRadius: 6,
        padding: "0 16px",
        cursor: "pointer",
        lineHeight: 1.5,
        height: 48,
        minWidth: 150,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function OverlayView({
  title,
  children,
  onClose,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  theme: { card: string; text: string; border: string; overlay: string };
}) {
  const { cardBorder } = useSettings();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: theme.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.card,
          border: cardBorder,
          borderRadius: 8,
          padding: 20,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Trebuchet MS', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: theme.text,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: theme.text,
            }}
          >
            <X size={24} strokeWidth={1.5} color={theme.text} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
