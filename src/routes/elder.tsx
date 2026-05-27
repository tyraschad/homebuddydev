import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Mic, Phone, X } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, DEFAULT_ANNOUNCEMENT_OFFSETS, type Reminder } from "@/lib/carer-store";
import { TalkToTextPopup } from "@/components/TalkToTextPopup";
import { speak } from "@/lib/talk.functions";



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

function timeUntilText(min: number, nowMin: number) {
  const diff = min - nowMin;
  if (diff <= 0) return "now";
  if (diff < 60) return `in ${diff} minute${diff !== 1 ? "s" : ""}`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (m === 0) return `in ${h} hour${h > 1 ? "s" : ""}`;
  return `in ${h}h ${m}m`;
}

function frequencyText(r: Reminder) {
  return r.repeatSchedule || (r.repeats ? "Repeats" : "Does not repeat");
}


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
  const { theme, appearance, textSize, announcementsEnabled } = useSettings();
  const { reminders, elder } = useCarer();
  const [now, setNow] = useState<Date | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selected, setSelected] = useState<{ reminder: Reminder; time: string } | null>(null);


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
    const list: { key: string; time: string; minutes: number; completed: boolean; reminder: Reminder }[] = [];
    reminders.forEach((r) => {
      r.times.forEach((t) => {
        const min = toMinutes(t);
        list.push({
          key: r.id + t,
          time: t,
          minutes: min,
          completed: nowMin >= 0 && nowMin >= min,
          reminder: r,
        });
      });
    });
    list.sort((a, b) => a.minutes - b.minutes);
    return list;
  }, [reminders, now]);

  const upcoming = items.filter((i) => !i.completed);
  const nextItem = upcoming[0];
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;

  const completedColor = appearance === "dark" ? "#B0B0B0" : "#6B6860";
  const timelineLine = appearance === "dark" ? "#5A5A6E" : "#BBBBB0";
  const timelineLabel = appearance === "dark" ? "#B0B0B0" : "#6B6860";
  const nextBg = appearance === "dark" ? "#1B5E20" : "#E8F5E9";
  const nextAccent = "#2E7D32";

  // Hour range: default 8 AM-8 PM, expand if reminders fall outside
  const startHour = items.length
    ? Math.min(8, Math.floor(Math.min(...items.map((i) => i.minutes)) / 60))
    : 8;
  const endHour = items.length
    ? Math.max(20, Math.ceil(Math.max(...items.map((i) => i.minutes)) / 60))
    : 20;
  const PX_PER_HOUR = 60;
  const timelineHeight = (endHour - startHour) * PX_PER_HOUR;
  const yFor = (min: number) => ((min - startHour * 60) / 60) * PX_PER_HOUR;
  const hourMarks: number[] = [];
  for (let h = startHour; h <= endHour; h++) hourMarks.push(h);
  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${ampm}`;
  };


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
              <h2 style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text, margin: 0, marginBottom: 12 }}>
                Today's Reminders
              </h2>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minHeight: 0 }}>
                {items.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center" }}>
                    <p style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: completedColor, margin: 0 }}>
                      No reminders scheduled today
                    </p>
                    <p style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, color: completedColor, marginTop: 4 }}>
                      All done!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Next Task hero */}
                    {nextItem ? (
                      <button
                        type="button"
                        onClick={() => setSelected({ reminder: nextItem.reminder, time: nextItem.time })}
                        style={{
                          textAlign: "left",
                          background: nextBg,
                          border: `2px solid ${nextAccent}`,
                          borderRadius: 12,
                          padding: 24,
                          marginBottom: 28,
                          cursor: "pointer",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
                          color: theme.text,
                          fontFamily: "inherit",
                        }}
                      >
                        <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: nextAccent, marginBottom: 8 }}>
                          Next Task
                        </div>
                        <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 24, color: theme.text, marginBottom: 6 }}>
                          {nextItem.reminder.name}
                        </div>
                        <div style={{ fontFamily: "Verdana, sans-serif", fontWeight: 700, fontSize: 18, color: nextAccent }}>
                          {timeUntilText(nextItem.minutes, nowMin)}
                        </div>
                      </button>
                    ) : (
                      <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: nextBg, color: theme.text, fontFamily: "Verdana, sans-serif", fontSize: 14, textAlign: "center" }}>
                        All reminders completed today! Great job!
                      </div>
                    )}

                    {/* Timeline */}
                    <div style={{ position: "relative", paddingLeft: 64, height: timelineHeight }}>
                      {/* Vertical line */}
                      <div style={{ position: "absolute", left: 56, top: 0, bottom: 0, width: 2, background: timelineLine }} />
                      {/* Hour labels */}
                      {hourMarks.map((h) => (
                        <div
                          key={h}
                          style={{
                            position: "absolute",
                            top: yFor(h * 60) - 6,
                            left: 0,
                            width: 48,
                            textAlign: "right",
                            fontFamily: "Verdana, sans-serif",
                            fontSize: 11,
                            color: timelineLabel,
                          }}
                        >
                          {formatHour(h)}
                        </div>
                      ))}
                      {/* Reminder items */}
                      {items.map((i) => {
                        const y = yFor(i.minutes);
                        const isNext = nextItem && i.key === nextItem.key;
                        return (
                          <button
                            key={i.key}
                            type="button"
                            onClick={() => setSelected({ reminder: i.reminder, time: i.time })}
                            style={{
                              position: "absolute",
                              top: y - 12,
                              left: 48,
                              right: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "4px 8px",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              color: theme.text,
                              fontFamily: "inherit",
                            }}
                          >
                            <span style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: i.completed ? timelineLine : (isNext ? nextAccent : theme.text),
                              flexShrink: 0,
                              opacity: i.completed ? 0.6 : 1,
                            }} />
                            <span style={{
                              fontFamily: "Verdana, sans-serif",
                              fontSize: i.completed ? 12 : 14,
                              color: i.completed ? completedColor : theme.text,
                              opacity: i.completed ? 0.6 : 1,
                              textDecoration: i.completed ? "line-through" : "none",
                              fontWeight: isNext ? 700 : 400,
                            }}>
                              <span style={{ color: completedColor, marginRight: 6 }}>{formatTimeStr(i.time)}</span>
                              {i.reminder.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardBox>
        </Column>

      </div>

      {overlay === "chat" && <TalkToTextPopup onClose={() => setOverlay(null)} />}
      {overlay === "call" && <CallPopup onClose={() => setOverlay(null)} theme={theme} />}
      {selected && (
        <ReminderDetailsPopup
          reminder={selected.reminder}
          time={selected.time}
          nowMin={nowMin}
          onClose={() => setSelected(null)}
          theme={theme}
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
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#6BA24A",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#5A8F3D";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#6BA24A";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Phone size={24} strokeWidth={2} color="#FFFFFF" />
      </button>
      <style>{`
        @media (max-width: 1199px) {
          .fab-phone { bottom: 12px !important; right: 12px !important; }
        }
        @media (max-width: 767px) {
          .fab-phone { width: 48px !important; height: 48px !important; bottom: 12px !important; right: 12px !important; }
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
        padding: 16, zIndex: 2000, boxSizing: "border-box",
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

function ReminderDetailsPopup({
  reminder,
  time,
  nowMin,
  onClose,
  theme,
}: {
  reminder: Reminder;
  time: string;
  nowMin: number;
  onClose: () => void;
  theme: { card: string; text: string; muted: string };
}) {
  const { cardBorder } = useSettings();
  const [lightbox, setLightbox] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (lightbox) setLightbox(null); else onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightbox]);

  const targetMin = toMinutes(time);
  const isFuture = targetMin > nowMin;
  const subtitle = `${formatTimeStr(time)} · ${frequencyText(reminder)}${isFuture ? ` · Next ${timeUntilText(targetMin, nowMin)}` : ""}`;
  const detail =
    reminder.type === "medication" && reminder.dose
      ? `Take ${reminder.dose} pill${reminder.dose > 1 ? "s" : ""}${reminder.details ? ` — ${reminder.details}` : ""}`
      : reminder.details || "";
  const photos = reminder.photo ? [reminder.photo] : [];
  const labelColor = theme.muted;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 2100, boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.card, border: cardBorder, borderRadius: 8, padding: 24,
          width: "90%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column", boxSizing: "border-box", color: theme.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 24, color: theme.text }}>
              {reminder.name}
            </h2>
            <div style={{ marginTop: 6, fontFamily: "Verdana, sans-serif", fontSize: 14, color: labelColor }}>
              {subtitle}
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: theme.text, flexShrink: 0 }}
          >
            <X size={20} strokeWidth={1.5} color={theme.text} />
          </button>
        </div>

        <Section label="Schedule" color={labelColor}>
          <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, color: theme.text }}>{formatTimeStr(time)}</div>
          <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, color: theme.text, marginTop: 2 }}>{frequencyText(reminder)}</div>
        </Section>

        {detail && (
          <Section label="Details" color={labelColor}>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.text }}>{detail}</div>
          </Section>
        )}

        {reminder.notes && (
          <Section label="Notes" color={labelColor}>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.text }}>{reminder.notes}</div>
          </Section>
        )}

        {photos.length > 0 && (
          <Section label="Reminder Photos" color={labelColor}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12 }}>
              {photos.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightbox(src)}
                  style={{ padding: 0, border: cardBorder, borderRadius: 4, overflow: "hidden", cursor: "pointer", background: "transparent" }}
                >
                  <img src={src} alt={`${reminder.name} ${idx + 1}`} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, zIndex: 2200,
          }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14, color, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
