import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Settings, Mic, Phone, X } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer } from "@/lib/carer-store";
import { TalkToTextPopup } from "@/components/TalkToTextPopup";

export const Route = createFileRoute("/elder")({
  component: ElderHome,
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
  return `${dayName}, ${monthName} ${ordinalSuffix(d.getDate())}`;
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
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function ElderHome() {
  const { theme, appearance, textSize } = useSettings();
  const { reminders } = useCarer();
  const [now, setNow] = useState<Date | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const dateDayStr = now ? formatDateDay(now) : "";
  const timeStr = now ? formatTime(now) : "";
  const greet = now ? greeting(now) : "Hello";

  const line1Size = textSize === "large" ? 34 : 28;
  const line2Size = textSize === "large" ? 53 : 44;

  const items = useMemo(() => {
    const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;
    const list: { key: string; time: string; label: string; completed: boolean; minutes: number }[] = [];
    reminders.forEach((r) => {
      r.times.forEach((t) => {
        const min = toMinutes(t);
        const detail = r.type === "medication" && r.dose ? ` - ${r.dose} pill${r.dose > 1 ? "s" : ""}` : "";
        list.push({
          key: r.id + t,
          time: t,
          label: `${t} ${r.name}${detail}`,
          completed: nowMin >= 0 && nowMin >= min,
          minutes: min,
        });
      });
    });
    list.sort((a, b) => a.minutes - b.minutes);
    return list;
  }, [reminders, now]);

  const upcoming = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  const completedColor = appearance === "dark" ? "#B0B0B0" : "#6B6860";

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
        position: "relative",
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
        <h1 style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 24, color: theme.text, margin: 0 }}>
          {greet}, Albert
        </h1>
        <Link
          to="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: theme.text,
            fontFamily: "'Trebuchet MS', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          <Settings size={24} strokeWidth={1.5} color={theme.text} />
          <span>Settings</span>
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", gap: 16, overflow: "hidden" }}>
        <Column width="50%">
          <CardBox height="auto" padding={24} center theme={theme}>
            <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: line1Size, color: theme.text, lineHeight: 1.3, marginBottom: 8 }}>
              {dateDayStr}
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: line2Size, color: theme.text, lineHeight: 1.2 }}>
              {timeStr}
            </div>
          </CardBox>

          <CardBox onClick={() => setOverlay("chat")} flex={1} padding={30} theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, height: "100%", width: "100%" }}>
              <Mic size={90} strokeWidth={2} color={theme.text} />
              <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 24, color: theme.text, textAlign: "center" }}>
                Tap to Ask a Question
              </div>
            </div>
          </CardBox>
        </Column>

        <Column width="50%">
          <CardBox flex={1} padding={16} theme={theme}>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
              <h2 style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text, margin: 0, marginBottom: 12, paddingRight: 72 }}>
                Today's Reminders
              </h2>
              <button
                type="button"
                onClick={() => setOverlay("call")}
                aria-label="Make a call"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#6BA24A",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 5,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#5A8F3D";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#6BA24A";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                }}
              >
                <Phone size={24} strokeWidth={2} color="#FFFFFF" />
              </button>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minHeight: 0 }}>
                {items.length === 0 ? (
                  <p style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: completedColor, textAlign: "center", margin: "auto" }}>
                    No reminders scheduled today
                  </p>
                ) : upcoming.length === 0 ? (
                  <>
                    <p style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.text, textAlign: "center", marginTop: 0, marginBottom: 16 }}>
                      All reminders completed today! Great job!
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {completed.map((i) => (
                        <CompletedRow key={i.key} label={i.label} color={completedColor} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {upcoming.map((i) => (
                        <div
                          key={i.key}
                          style={{
                            fontFamily: "Verdana, sans-serif",
                            fontSize: 18,
                            fontWeight: 700,
                            color: theme.text,
                            opacity: 1,
                            transition: "all 0.3s ease",
                          }}
                        >
                          {i.label}
                        </div>
                      ))}
                    </div>
                    {completed.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                        {completed.map((i) => (
                          <CompletedRow key={i.key} label={i.label} color={completedColor} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardBox>
        </Column>
      </div>

      {overlay === "chat" && <TalkToTextPopup onClose={() => setOverlay(null)} />}
      {overlay === "call" && <CallPopup onClose={() => setOverlay(null)} theme={theme} />}
    </main>
  );
}

function CompletedRow({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        fontFamily: "Verdana, sans-serif",
        fontSize: 12,
        fontWeight: 400,
        color,
        opacity: 0.6,
        textDecoration: "line-through",
        transition: "all 0.3s ease",
      }}
    >
      {label}
    </div>
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
  flex,
  padding = 20,
  center = false,
  theme,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  height?: string;
  flex?: number;
  padding?: number;
  center?: boolean;
  theme: { bg: string; card: string; text: string; border: string };
}) {
  const { cardBorder } = useSettings();
  const style: React.CSSProperties = {
    height: flex ? "100%" : height,
    flex: flex ?? undefined,
    flexShrink: flex ? 1 : 0,
    minHeight: flex ? 0 : undefined,
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
          <h2 style={{ margin: 0, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 20, color: theme.text }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: theme.text }}
          >
            <X size={24} strokeWidth={1.5} color={theme.text} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

const EMERGENCY_CONTACTS = [
  { id: "e1", name: "Emergency Services", phone: "911" },
  { id: "e2", name: "Poison Control", phone: "1-800-222-1222" },
];

function CallPopup({ onClose, theme }: { onClose: () => void; theme: { card: string; text: string; border: string; overlay: string; muted: string } }) {
  const { elder } = useCarer();
  const { cardBorder, appearance } = useSettings();
  const contacts = elder.contacts ?? [];
  const separator = appearance === "dark" ? "#5A5A6E" : "#E5E5E0";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 50, boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.card, border: cardBorder, borderRadius: 8, padding: 24,
          width: "90%", maxWidth: 500, maxHeight: "90vh",
          display: "flex", flexDirection: "column", boxSizing: "border-box", color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 24, color: theme.text }}>
            Make a Call
          </h2>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: theme.text }}
          >
            <X size={20} strokeWidth={1.5} color={theme.text} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted }}>No contacts saved</div>
              <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, color: theme.muted, marginTop: 4 }}>Add contacts in settings</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {contacts.map((c) => (
                <ContactRow key={c.id} name={c.name} phone={c.phone} theme={theme} separator={separator} />
              ))}
            </div>
          )}

          <h3 style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14, color: theme.text, marginTop: 20, marginBottom: 4 }}>
            Emergency
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {EMERGENCY_CONTACTS.map((c) => (
              <ContactRow key={c.id} name={c.name} phone={c.phone} theme={theme} separator={separator} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ name, phone, theme, separator }: { name: string; phone: string; theme: { text: string; muted: string }; separator: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
      style={{
        display: "flex", flexDirection: "column", padding: "12px 0",
        borderBottom: `1px solid ${separator}`, textDecoration: "none", color: "inherit", cursor: "pointer",
      }}
    >
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, fontWeight: 700, color: theme.text }}>{name}</div>
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted, marginTop: 2 }}>{phone}</div>
    </a>
  );
}
