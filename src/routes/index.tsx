import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Mic, Phone, X } from "lucide-react";

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

const INK = "#1A1A2E";
const MUTED = "#6B6860";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function Index() {
  // Avoid SSR/client hydration mismatch: render time-dependent strings only on client.
  const [now, setNow] = useState<Date | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  const dateStr = now ? formatDate(now) : "";
  const dayStr = now ? formatDay(now) : "";
  const timeStr = now ? formatTime(now) : "";
  const greet = now ? greeting(now) : "Hello";

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        background: "#F2F2EF",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        color: INK,
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: INK,
            margin: 0,
          }}
        >
          {greet}, Albert
        </h1>
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: INK,
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <Settings size={24} strokeWidth={1.5} color={INK} />
          <span>Settings</span>
        </button>
      </header>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 16,
          overflow: "hidden",
        }}
      >
        {/* Left 35% */}
        <Column width="35%">
          <CardBox>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: MUTED }}>
              {dateStr}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                fontSize: 56,
                color: INK,
                lineHeight: 1.1,
                marginTop: 8,
              }}
            >
              {dayStr}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                fontSize: 48,
                color: INK,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              {timeStr}
            </div>
          </CardBox>

          <CardBox onClick={() => setOverlay("chat")}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                height: "100%",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  border: `2px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Mic size={60} strokeWidth={2} color={INK} />
              </div>
              <div
                style={{
                  fontFamily: "Verdana, sans-serif",
                  fontSize: 20,
                  color: INK,
                  textAlign: "center",
                }}
              >
                Tap to Ask a Question
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActionBtn>Change TV Input</ActionBtn>
                <ActionBtn>Go to Netflix</ActionBtn>
                <ActionBtn>Turn on Washer</ActionBtn>
              </div>
            </div>
          </CardBox>
        </Column>

        {/* Right 65% */}
        <Column width="65%">
          <CardBox>
            <h2
              style={{
                fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: INK,
                margin: 0,
              }}
            >
              Today's Reminders
            </h2>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "Verdana, sans-serif",
                  fontSize: 24,
                  color: INK,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                You're all clear for today
              </p>
            </div>
          </CardBox>

          <CardBox onClick={() => setOverlay("call")}>
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
              <Phone size={60} strokeWidth={2} color={INK} />
              <div
                style={{
                  fontFamily: "Verdana, sans-serif",
                  fontSize: 24,
                  color: INK,
                }}
              >
                Make a call
              </div>
            </div>
          </CardBox>
        </Column>
      </div>

      {overlay && (
        <OverlayView
          title={overlay === "chat" ? "Ask Albert a Question" : "Make a Call"}
          onClose={() => setOverlay(null)}
        >
          {overlay === "chat" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, minHeight: 200 }} />
              <input
                type="text"
                placeholder="Type or tap the mic to speak…"
                style={{
                  width: "100%",
                  border: `1.5px solid ${INK}`,
                  borderRadius: 6,
                  padding: "10px 16px",
                  fontFamily: "Verdana, sans-serif",
                  fontSize: 18,
                  color: INK,
                  background: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 200 }} />
          )}
        </OverlayView>
      )}
    </main>
  );
}

function Column({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardBox({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const style: React.CSSProperties = {
    height: "48%",
    flexShrink: 0,
    overflow: "hidden",
    background: "#FFFFFF",
    border: `1.5px solid ${INK}`,
    borderRadius: 8,
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    cursor: onClick ? "pointer" : "default",
    color: INK,
    fontFamily: "inherit",
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

function ActionBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      style={{
        fontFamily: "'Trebuchet MS', sans-serif",
        fontWeight: 700,
        fontSize: 14,
        color: INK,
        background: "#FFFFFF",
        border: `1.5px solid ${INK}`,
        borderRadius: 6,
        padding: "10px 16px",
        cursor: "pointer",
        lineHeight: 1.5,
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
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
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
        background: "rgba(0,0,0,0.5)",
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
          background: "#FFFFFF",
          border: `1.5px solid ${INK}`,
          borderRadius: 8,
          padding: 20,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Trebuchet MS', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: INK,
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
              color: INK,
            }}
          >
            <X size={24} strokeWidth={1.5} color={INK} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
