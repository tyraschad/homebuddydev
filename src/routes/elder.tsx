import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings,
  Mic,
  Phone,
  X,
  Pill,
  CalendarDays,
  PersonStanding,
  Circle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, DEFAULT_ANNOUNCEMENT_OFFSETS, type ReminderType } from "@/lib/carer-store";
import { TalkToTextPopup } from "@/components/TalkToTextPopup";
import { speak } from "@/lib/talk.functions";
import horizontalLogo from "@/assets/homebuddy-horizontal-logo.png.asset.json";

// V1 Elder palette (WCAG): #8F8F8F bg, #000000 text/mic, #6CA24E phone
const V1_BG = "#8F8F8F";
const V1_FG = "#000000";
const V1_PHONE = "#6CA24E";
const V1_CARD_BORDER = "1px solid #000000";
const V1_MUTED = "rgba(0,0,0,0.55)";
const V1_RULE = "rgba(0,0,0,0.2)";

// V2 Elder palette (Rest of App): Sage / Light Sage / Dark Navy / Amber / White
const V2_SAGE = "#519D46";
const V2_SAGE_LIGHT = "#CBE894";
const V2_NAVY = "#25483A";
const V2_AMBER = "#FEE78C";
const V2_WHITE = "#FFFFFF";

const FONT_INTER = "Inter, sans-serif";
const FONT_NEWSREADER = "Newsreader, Georgia, serif";

function ReminderIcon({ type, size = 20, color = "#000000" }: { type: ReminderType; size?: number; color?: string }) {
  const props = { size, strokeWidth: 2, color };
  if (type === "medication") return <Pill {...props} />;
  if (type === "appointment") return <CalendarDays {...props} />;
  if (type === "activity") return <PersonStanding {...props} />;
  return <Circle {...props} />;
}

export const Route = createFileRoute("/elder")({
  component: ElderHome,
  head: () => ({
    meta: [{ title: "Albert's Home" }, { name: "description", content: "Albert's simple home screen." }],
  }),
});

type Overlay = "chat" | "call" | null;

function ordinalSuffix(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function formatDateDay(d: Date) {
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
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
function formatTimeStr(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function buildAnnouncement(name: string, reminderName: string, offsetMin: number, time: string) {
  if (offsetMin === 0) return `Hi ${name}, it's time for your ${reminderName}.`;
  const timeStr = formatTimeStr(time);
  if (offsetMin >= 60) {
    const h = Math.round(offsetMin / 60);
    return `Hi ${name}, you have ${reminderName} in ${h} hour${h > 1 ? "s" : ""}, at ${timeStr}.`;
  }
  return `Hi ${name}, you have ${reminderName} in ${offsetMin} minutes, at ${timeStr}.`;
}

function ElderHome() {
  const { theme, appearance, textSize, announcementsEnabled, highContrast } = useSettings();
  const v2 = !highContrast;

  // Variant tokens
  const pageBg = v2 ? V2_WHITE : V1_BG;
  const cardBg = V2_WHITE;
  const cardBorderStyle = v2 ? `1px solid ${V2_SAGE_LIGHT}` : V1_CARD_BORDER;
  const cardRadius = v2 ? 16 : 4;
  const cardShadow = v2 ? "0 4px 12px rgba(37,72,58,0.08)" : "none";
  const cardText = v2 ? V2_NAVY : V1_FG;
  const cardTextBlack = cardText;
  const headerTextColor = v2 ? V2_NAVY : V1_FG;
  const headerTextShadow = "none";
  const micBorderColor = v2 ? V2_SAGE : V1_FG;
  const micFill = v2 ? V2_WHITE : V1_FG;
  const micIconColor = v2 ? V2_NAVY : V2_WHITE;
  const micSize = v2 ? 150 : 120;
  const micIconPx = 80;
  const nextBorderV = v2 ? `2px solid ${V2_SAGE}` : `1px solid ${V1_FG}`;
  const nextBgV = v2 ? V2_AMBER : V2_WHITE;
  const remIconColor = v2 ? V2_NAVY : V1_FG;
  const fabBg = v2 ? V2_SAGE : V1_PHONE;
  const fabIconColor = V2_WHITE;
  const mutedText = v2 ? "rgba(37,72,58,0.65)" : V1_MUTED;
  const ruleColor = v2 ? V2_SAGE_LIGHT : V1_RULE;
  const headerFont = v2 ? FONT_NEWSREADER : FONT_INTER;
  const { reminders, elder } = useCarer();
  const [now, setNow] = useState<Date | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 20);
    return () => clearInterval(t);
  }, []);

  // Announcement scheduler: speak reminders aloud at configured offsets.
  const announcedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!now || !announcementsEnabled) return;
    const today = now.toISOString().slice(0, 10);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    reminders.forEach((r) => {
      const offsets = r.announcementOffsets ?? DEFAULT_ANNOUNCEMENT_OFFSETS;
      r.times.forEach((t) => {
        const targetMin = toMinutes(t);
        offsets.forEach((off) => {
          const announceMin = targetMin - off;
          // Fire if within current minute and not too late (e.g. user just opened the app)
          if (nowMin === announceMin) {
            const key = `${today}|${r.id}|${t}|${off}`;
            if (announcedRef.current.has(key)) return;
            announcedRef.current.add(key);
            const text = buildAnnouncement(elder.name || "there", r.name, off, t);
            speak({ data: { text } })
              .then((res) => {
                const audio = new Audio(`data:${res.mime};base64,${res.audio}`);
                audio.play().catch(() => {});
              })
              .catch(() => {});
          }
        });
      });
    });
  }, [now, reminders, announcementsEnabled, elder.name]);

  const dateDayStr = now ? formatDateDay(now) : "";
  const timeStr = now ? formatTime(now) : "";
  const greet = now ? greeting(now) : "Hello";

  const line1Size = textSize === "large" ? 34 : 28;
  const line2Size = textSize === "large" ? 53 : 44;

  const items = useMemo(() => {
    const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;
    const list: {
      key: string;
      time: string;
      reminder: (typeof reminders)[number];
      completed: boolean;
      minutes: number;
    }[] = [];
    reminders.forEach((r) => {
      r.times.forEach((t) => {
        const min = toMinutes(t);
        list.push({
          key: r.id + t,
          time: t,
          reminder: r,
          completed: nowMin >= 0 && nowMin >= min,
          minutes: min,
        });
      });
    });
    list.sort((a, b) => a.minutes - b.minutes);
    return list;
  }, [reminders, now]);

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const nextKey = items.find((i) => !i.completed)?.key;
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const openItem = items.find((i) => i.key === openItemKey) ?? null;

  const timelineColor = appearance === "dark" ? "#5A5A6E" : "#D0D0D0";
  const nextBg = appearance === "dark" ? "#2E5A2E" : "#E8F5E9";
  const nextBorder = appearance === "dark" ? "#3F7A3F" : "#A5D6A7";
  const completedColor = appearance === "dark" ? "#B0B0B0" : "#6B6860";

  function formatRelative(min: number) {
    const diff = min - nowMin;
    if (diff === 0) return "now";
    const abs = Math.abs(diff);
    let txt: string;
    if (abs < 60) txt = `${abs} minute${abs === 1 ? "" : "s"}`;
    else {
      const h = Math.round(abs / 60);
      txt = `${h} hour${h === 1 ? "" : "s"}`;
    }
    return diff > 0 ? `in ${txt}` : `${txt} ago`;
  }

  function frequencyLabel(r: (typeof reminders)[number]) {
    if (r.repeatSchedule) return r.repeatSchedule;
    return r.repeats ? "Repeats" : "Does not repeat";
  }

  const completedItems = items.filter((i) => i.completed);
  const upcomingItems = items.filter((i) => !i.completed);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: pageBg,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        color: cardText,
        lineHeight: 1.5,
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={horizontalLogo.url} alt="HomeBuddy" height={28} style={{ display: "block", height: 28, width: "auto" }} />
          <h1
            style={{
              fontFamily: headerFont,
              fontWeight: 700,
              fontSize: v2 ? 24 : 20,
              color: headerTextColor,
              margin: 0,
              textShadow: headerTextShadow,
            }}
          >
            {greet}, {elder.name || "Albert"}
          </h1>
        </div>
        <Link
          to="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            color: headerTextColor,
            fontFamily: FONT_INTER,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          <span>Settings</span>
          <Settings size={28} strokeWidth={2} color={headerTextColor} />
        </Link>
      </header>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
        className="elder-grid"
      >
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Clock card */}
          <div
            style={{
              background: cardBg,
              border: cardBorderStyle,
              borderRadius: cardRadius,
              padding: 24,
              textAlign: "center",
              boxShadow: cardShadow,
            }}
          >
            <div
              data-readable="true"
              style={{
                fontFamily: headerFont,
                fontWeight: 700,
                fontSize: line1Size,
                color: cardText,
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              {dateDayStr}
            </div>
            <div
              data-readable="true"
              style={{
                fontFamily: headerFont,
                fontWeight: 700,
                fontSize: line2Size,
                color: cardText,
                lineHeight: 1.2,
              }}
            >
              {timeStr}
            </div>
          </div>

          {/* Ask a Question card */}
          <button
            type="button"
            onClick={() => setOverlay("chat")}
            style={{
              background: cardBg,
              border: cardBorderStyle,
              borderRadius: cardRadius,
              padding: 16,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              cursor: "pointer",
              minHeight: 280,
              boxShadow: cardShadow,
            }}
            aria-label="Tap to ask a question"
          >
            <div
              style={{
                width: micSize,
                height: micSize,
                aspectRatio: "1 / 1",
                flexShrink: 0,
                borderRadius: "50%",
                background: v2 ? "#FFFFFF" : "#000000",
                border: `2px solid ${micBorderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mic size={micIconPx} strokeWidth={2} color={micIconColor} />
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: cardTextBlack,
                textAlign: "center",
                paddingTop: 16,
              }}
            >
              Tap to Ask a Question
            </div>
          </button>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              background: cardBg,
              border: cardBorderStyle,
              borderRadius: cardRadius,
              padding: 16,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxShadow: cardShadow,
            }}
          >
            <h2
              data-readable="true"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: cardTextBlack,
                margin: 0,
                paddingBottom: 12,
              }}
            >
              Today's Reminders
            </h2>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {items.length === 0 ? (
                <p
                  data-readable="true"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: COMPLETED_COLOR,
                    textAlign: "center",
                    marginTop: 24,
                  }}
                >
                  No reminders scheduled today
                </p>
              ) : (
                <div style={{ position: "relative", paddingLeft: 16 }}>
                  {/* Timeline vertical line */}
                  <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 2, background: "#D0D0D0" }} />

                  {/* Completed (collapsible) */}
                  {completedItems.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setShowCompleted((v) => !v)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px 0",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: COMPLETED_COLOR,
                        }}
                        aria-expanded={showCompleted}
                      >
                        {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Completed Today ({completedItems.length})
                      </button>
                      {showCompleted && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          {completedItems.map((i) => (
                            <button
                              key={i.key}
                              type="button"
                              onClick={() => setOpenItemKey(i.key)}
                              style={{
                                background: "transparent",
                                border: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                padding: "4px 0",
                                fontFamily: "Inter, sans-serif",
                                fontSize: 14,
                                color: COMPLETED_COLOR,
                                opacity: 0.6,
                                textDecoration: "line-through",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <ReminderIcon type={i.reminder.type} size={20} color={COMPLETED_COLOR} />
                              <span data-readable="true">
                                {formatTimeStr(i.time)} — {i.reminder.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upcoming */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {upcomingItems.map((i) => {
                      const isNext = i.key === nextKey;
                      const timeText = formatTimeStr(i.time);
                      const rel = formatRelative(i.minutes);
                      if (isNext) {
                        return (
                          <button
                            key={i.key}
                            type="button"
                            onClick={() => setOpenItemKey(i.key)}
                            style={{
                              background: "#FFFFFF",
                              border: nextBorderV,
                              borderRadius: v2 ? 8 : 4,
                              padding: "12px 16px",
                              textAlign: "left",
                              cursor: "pointer",
                              fontFamily: "Inter, sans-serif",
                              color: cardTextBlack,
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ReminderIcon type={i.reminder.type} size={20} color={remIconColor} />
                              <span data-readable="true" style={{ fontSize: 16, fontWeight: 700 }}>
                                {i.reminder.name}
                              </span>
                            </div>
                            <div data-readable="true" style={{ fontSize: 14, color: COMPLETED_COLOR, paddingLeft: 28 }}>
                              {timeText} — {rel}
                            </div>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={i.key}
                          type="button"
                          onClick={() => setOpenItemKey(i.key)}
                          style={{
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            padding: "4px 0",
                            fontFamily: "Inter, sans-serif",
                            color: cardTextBlack,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ReminderIcon type={i.reminder.type} size={20} color={remIconColor} />
                            <span data-readable="true" style={{ fontSize: 16 }}>
                              {i.reminder.name}
                            </span>
                          </div>
                          <div data-readable="true" style={{ fontSize: 14, color: COMPLETED_COLOR, paddingLeft: 28 }}>
                            {timeText}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {overlay === "chat" && <TalkToTextPopup onClose={() => setOverlay(null)} />}
      {overlay === "call" && <CallPopup onClose={() => setOverlay(null)} theme={theme} />}
      {openItem && (
        <ReminderDetailsPopup
          onClose={() => setOpenItemKey(null)}
          reminder={openItem.reminder}
          time={openItem.time}
          relative={formatRelative(openItem.minutes)}
          frequency={frequencyLabel(openItem.reminder)}
        />
      )}

      {/* Floating Phone Button */}
      <button
        type="button"
        className="fab-phone"
        onClick={() => setOverlay("call")}
        aria-label="Make a call"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: fabBg,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: v2 ? "0 4px 8px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Phone size={36} strokeWidth={2} color={fabIconColor} />
      </button>
      <style>{`
        @media (max-width: 720px) {
          .elder-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function CompletedRow({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        fontFamily: "Verdana, sans-serif",
        fontSize: 16,

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
  return <div style={{ width, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>{children}</div>;
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

function CallPopup({
  onClose,
  theme,
}: {
  onClose: () => void;
  theme: { card: string; text: string; border: string; overlay: string; muted: string };
}) {
  const { elder } = useCarer();
  const { cardBorder, appearance } = useSettings();
  const contacts = elder.contacts ?? [];
  const separator = appearance === "dark" ? "#4A4A5E" : "#EFEFEF";
  const dividerColor = appearance === "dark" ? "#6B6B7B" : "#BDBDBD";
  const isDark = appearance === "dark";

  const emergencyPhones = new Set(EMERGENCY_CONTACTS.map((c) => c.phone.replace(/[^0-9]/g, "")));
  const personalContacts = contacts.filter((c) => {
    const normalized = c.phone.replace(/[^0-9]/g, "");
    return !emergencyPhones.has(normalized);
  });

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
        zIndex: 2000,
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.card,
          border: cardBorder,
          borderRadius: 8,
          padding: 24,
          width: "90%",
          maxWidth: 500,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 24, color: theme.text }}>
            Make a Call
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: theme.text }}
          >
            <X size={20} strokeWidth={1.5} color={theme.text} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {/* Personal Contacts */}
          {personalContacts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted }}>
                No personal contacts saved
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {personalContacts.map((c) => (
                <ContactRow key={c.id} name={c.name} phone={c.phone} theme={theme} separator={separator} />
              ))}
            </div>
          )}

          {/* Visual Divider */}
          <div style={{ width: "100%", height: 1, background: dividerColor, margin: "16px 0" }} />

          {/* Emergency Contacts */}
          <div
            style={{
              background: isDark ? "#C62828" : "#FFCCCC",
              borderRadius: 4,
              padding: "8px 0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: "#1A1A2E",
                textTransform: "uppercase",
                padding: "4px 12px 8px 12px",
                letterSpacing: "0.5px",
              }}
            >
              Emergency
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {EMERGENCY_CONTACTS.map((c) => (
                <EmergencyRow key={c.id} name={c.name} phone={c.phone} isDark={isDark} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  name,
  phone,
  theme,
  separator,
}: {
  name: string;
  phone: string;
  theme: { text: string; muted: string };
  separator: string;
}) {
  return (
    <a
      href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 12,
        borderBottom: `1px solid ${separator}`,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F5F5F5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, fontWeight: 700, color: theme.text }}>{name}</div>
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted, marginTop: 2 }}>{phone}</div>
    </a>
  );
}

function EmergencyRow({ name, phone, isDark }: { name: string; phone: string; isDark: boolean }) {
  const textColor = "#1A1A2E";
  const phoneColor = isDark ? "#2A2A3E" : "#4A4A4A";
  const separator = isDark ? "#B71C1C" : "#FFB3B3";
  return (
    <a
      href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 12,
        borderBottom: `1px solid ${separator}`,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = isDark ? "#D32F2F" : "#FFB3B3";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, fontWeight: 700, color: textColor }}>{name}</div>
      <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: phoneColor, marginTop: 2 }}>{phone}</div>
    </a>
  );
}

function ReminderDetailsPopup({
  onClose,
  reminder,
  time,
  frequency,
}: {
  onClose: () => void;
  reminder: { name: string; details?: string; notes?: string; photo?: string; dose?: number; type: ReminderType };
  time: string;
  relative: string;
  frequency: string;
}) {
  const { highContrast } = useSettings();
  const v2 = !highContrast;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const timeStr = formatTimeStr(time);
  const detailsText = [reminder.dose ? `${reminder.dose} pill${reminder.dose > 1 ? "s" : ""}` : null, reminder.details]
    .filter(Boolean)
    .join(" — ");

  const textColor = v2 ? "#1B5E5E" : "#000000";
  const iconColor = v2 ? "#1B5E5E" : "#000000";
  const containerBorder = v2 ? "2px solid #4A7C59" : "2px solid #000000";
  const containerShadow = v2 ? "0 8px 16px rgba(0,0,0,0.25)" : "0 4px 8px rgba(0,0,0,0.2)";
  const notesBg = v2 ? "#E8F5E9" : "#F9F9F9";

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 2000,
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: containerBorder,
          borderRadius: 8,
          padding: 20,
          width: "90%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          color: textColor,
          boxShadow: containerShadow,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12 }}>
            <ReminderIcon type={reminder.type} size={24} color={iconColor} />
            <h2 style={{ margin: 0, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 24, color: textColor }}>
              {reminder.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: iconColor }}
          >
            <X size={24} strokeWidth={2} color={iconColor} />
          </button>
        </div>

        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: textColor, paddingBottom: 8 }}>
          {timeStr}
        </div>

        {frequency && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: textColor, paddingBottom: 12 }}>
            {frequency}
          </div>
        )}

        {detailsText && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: textColor, paddingBottom: 12 }}>
            {detailsText}
          </div>
        )}

        {reminder.notes && (
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              color: textColor,
              background: notesBg,
              borderRadius: 4,
              padding: 12,
              marginTop: 12,
            }}
          >
            {reminder.notes}
          </div>
        )}

        {reminder.photo && (
          <div style={{ marginTop: 16 }}>
            <img
              src={reminder.photo}
              alt={reminder.name}
              style={{
                width: 100,
                height: 100,
                objectFit: "cover",
                borderRadius: 4,
                border: `1px solid ${v2 ? "#A8D5BA" : "#D0D0D0"}`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
