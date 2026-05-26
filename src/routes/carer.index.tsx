import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, X,
  Pill, Stethoscope, Activity, HelpCircle, Edit, Trash2, AlertTriangle, Minus,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import {
  useCarer, type Reminder, type ReminderType, TYPE_COLOR, TYPE_LABEL, reminderBg,
} from "@/lib/carer-store";

export const Route = createFileRoute("/carer/")({
  component: CarerPortal,
  head: () => ({ meta: [{ title: "Carer Portal" }] }),
});

const GREEN = "#2F8F4E";
const RED = "#C0392B";

type ViewMode = "day" | "week" | "month" | "list";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtLong(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function ageFromDob(dob: string) {
  if (!dob) return "";
  const b = new Date(dob);
  if (isNaN(b.getTime())) return "";
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return `${a} years old`;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function iconForType(type: ReminderType, size = 18, color = "currentColor") {
  switch (type) {
    case "medication": return <Pill size={size} color={color} />;
    case "appointment": return <Stethoscope size={size} color={color} />;
    case "activity": return <Activity size={size} color={color} />;
    default: return <HelpCircle size={size} color={color} />;
  }
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Reminder applies on a given date based on its schedule
function appliesOn(r: Reminder, d: Date) {
  if (r.repeats === false) {
    return r.oneTimeDate === ymd(d);
  }
  const day = d.getDay(); // 0 Sun .. 6 Sat
  switch (r.repeatSchedule) {
    case "Daily": return true;
    case "Weekdays": return day >= 1 && day <= 5;
    case "Weekly": return r.weekday == null ? true : day === r.weekday;
    case "Monthly": return (r.monthlyDates ?? []).includes(d.getDate());
    case "Custom": return (r.customDays ?? []).includes(day);
    default: return true;
  }
}

function formatSchedule(r: Reminder) {
  if (r.repeats === false) {
    if (!r.oneTimeDate) return "Does not repeat";
    const d = new Date(r.oneTimeDate + "T00:00:00");
    return `Once on ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  }
  switch (r.repeatSchedule) {
    case "Daily": return "Daily";
    case "Weekdays": return "Weekdays (Mon-Fri)";
    case "Weekly":
      return `Weekly on ${WEEKDAY_LONG[r.weekday ?? 1]}`;
    case "Monthly": {
      const dates = (r.monthlyDates ?? []).slice().sort((a, b) => a - b);
      if (!dates.length) return "Monthly";
      return `Monthly on ${dates.map(ordinal).join(", ")}`;
    }
    case "Custom": {
      const days = (r.customDays ?? []).slice().sort((a, b) => a - b);
      if (!days.length) return "Custom";
      return `Custom (${days.map((d) => WEEKDAY_SHORT[d]).join(", ")})`;
    }
    default: return r.repeatSchedule;
  }
}


function CarerPortal() {
  const { theme, cardBorder, buttonBorder, inputBorder, appearance } = useSettings();
  const { elder, reminders, addReminder, updateReminder, deleteReminder } = useCarer();

  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [profileOpen, setProfileOpen] = useState(true);
  const [headerDate, setHeaderDate] = useState("");

  useEffect(() => {
    setHeaderDate(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [viewing, setViewing] = useState<Reminder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null);

  const today = new Date();
  const isToday = ymd(cursor) === ymd(today);

  // Grey "panel" backgrounds for header + schedule controls
  const panelBg = appearance === "dark" ? "#2A2A3E" : "#F5F0E8";
  const gridLine = appearance === "dark" ? "#555555" : "#CCCCCC";

  const headerStyle: CSSProperties = {
    background: panelBg,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 16,
    borderBottom: cardBorder,
  };

  const btnPrimary: CSSProperties = {
    background: GREEN, color: "#fff", border: "none", padding: "10px 18px",
    borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700,
    fontSize: 16, cursor: "pointer",
  };
  const btnSecondary: CSSProperties = {
    background: "transparent", color: theme.text, border: buttonBorder,
    padding: "10px 18px", borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif",
    fontWeight: 700, fontSize: 16, cursor: "pointer",
  };

  const whiteCard: CSSProperties = {
    background: theme.card, border: cardBorder, borderRadius: 8,
    padding: 16, margin: 16,
  };
  const greyPanel: CSSProperties = {
    background: panelBg, borderRadius: 8, padding: 16, margin: 16,
  };

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: "Verdana, sans-serif", lineHeight: 1.5 }}>
      {/* BOX 1: HEADER */}
      <header style={headerStyle}>
        <div style={{ justifySelf: "start" }}>
          <Link to="/" style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <ArrowLeft size={18} /> View Elder Screen
          </Link>
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 26, color: theme.text }}>
            {elder.name}'s Care Plan
          </h1>
          <div style={{ fontSize: 14, color: theme.muted, marginTop: 4 }}>
            {headerDate}
          </div>
        </div>
        <div style={{ justifySelf: "end" }}>
          <Link to="/carer/settings" style={{ color: theme.text, fontSize: 14, textDecoration: "underline",
            fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
            Carer Portal Settings
          </Link>
        </div>
      </header>

      {/* BOX 2: ELDER PROFILE CARD (white) */}
      <section style={whiteCard}>
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, width: "100%" }}
        >
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: theme.bg, border: buttonBorder,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
            fontWeight: 700, fontSize: 24, color: theme.text, flexShrink: 0, overflow: "hidden" }}>
            {elder.avatar ? <img src={elder.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : elder.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 20, fontFamily: "Georgia, serif", color: theme.text }}>{elder.name}</div>
            <div style={{ fontSize: 14, color: theme.muted }}>{ageFromDob(elder.dob)}</div>
          </div>
          {profileOpen ? <ChevronUp size={20} color={theme.text} /> : <ChevronDown size={20} color={theme.text} />}
        </button>

        {profileOpen && (
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <Field label="Health conditions">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {elder.conditions.length === 0 && <span style={{ color: theme.muted }}>None added.</span>}
                {elder.conditions.map((c) => (
                  <span key={c} style={{ background: theme.bg, border: buttonBorder, borderRadius: 999,
                    padding: "4px 12px", fontSize: 12, color: theme.text, fontFamily: "'Trebuchet MS', sans-serif" }}>
                    {c}
                  </span>
                ))}
              </div>
            </Field>
            <Field label="Notes"><div>{elder.notes || <span style={{ color: theme.muted }}>—</span>}</div></Field>
            <Field label="Phone contacts">
              <div style={{ display: "grid", gap: 6 }}>
                {elder.contacts.length === 0 && <span style={{ color: theme.muted }}>None added.</span>}
                {elder.contacts.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    <span style={{ color: theme.muted }}>{c.phone}</span>
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Instruction context"><div style={{ color: theme.muted }}>{elder.context || "—"}</div></Field>
          </div>
        )}
      </section>

      {/* BOX 3: SCHEDULE CONTROLS (grey panel) */}
      <section style={{ ...greyPanel, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["day", "week", "month", "list"] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setView(m)} style={{
              background: view === m ? theme.text : theme.card,
              color: view === m ? theme.card : theme.text,
              border: buttonBorder, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
              textTransform: "capitalize",
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => shiftCursor(view, cursor, setCursor, -1)} style={iconBtn(theme, buttonBorder)}><ChevronLeft size={18} /></button>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: "center" }}>
            {labelForCursor(view, cursor)}
          </span>
          <button onClick={() => shiftCursor(view, cursor, setCursor, 1)} style={iconBtn(theme, buttonBorder)}><ChevronRight size={18} /></button>
          {!isToday && (
            <button onClick={() => setCursor(new Date())} style={{
              background: "transparent", color: "#2563EB", border: "none", padding: "6px 8px",
              fontSize: 14, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
              textDecoration: "underline",
            }}>Today</button>
          )}
        </div>
        <button onClick={() => setPickCategoryOpen(true)} style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={18} /> Add Reminder / Medication
        </button>
      </section>

      {/* BOX 4: CALENDAR (white card) */}
      <section style={whiteCard}>
        {view === "day" && <DayView date={cursor} reminders={reminders} onOpen={setViewing} onAdd={() => setPickCategoryOpen(true)} theme={theme} appearance={appearance} gridLine={gridLine} />}
        {view === "week" && <WeekView date={cursor} reminders={reminders} onOpen={setViewing} theme={theme} appearance={appearance} gridLine={gridLine} />}
        {view === "month" && <MonthView date={cursor} reminders={reminders} onPickDay={(d) => { setCursor(d); setView("day"); }} theme={theme} gridLine={gridLine} />}
        {view === "list" && <ListView reminders={reminders} onOpen={setViewing} onEdit={(r) => setEditing(r)} onDelete={(r) => setConfirmDelete(r)} theme={theme} appearance={appearance} gridLine={gridLine} panelBg={panelBg} />}
      </section>


      {/* MODALS */}
      {pickCategoryOpen && (
        <CategoryPicker
          onClose={() => setPickCategoryOpen(false)}
          onPick={(type) => {
            setPickCategoryOpen(false);
            setEditing({
              id: uid(), type, name: "", timesPerDay: 1, times: ["08:00"],
              repeatSchedule: "Daily", elderId: elder.id,
              dose: type === "medication" ? 1 : undefined,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            });
          }}
        />
      )}

      {editing && (
        <ReminderForm
          initial={editing}
          existing={reminders.some((r) => r.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            if (reminders.some((x) => x.id === r.id)) updateReminder(r);
            else addReminder(r);
            setEditing(null);
          }}
          onDelete={(r) => { setEditing(null); setConfirmDelete(r); }}
        />
      )}

      {viewing && (
        <ViewReminderModal
          reminder={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => { setConfirmDelete(viewing); setViewing(null); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDelete
          name={confirmDelete.name}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { deleteReminder(confirmDelete.id); setConfirmDelete(null); }}
        />
      )}

      <style>{`
        input[type="text"], input[type="number"], input[type="time"], input[type="date"], textarea, select {
          background: ${theme.bg}; color: ${theme.text}; border: ${inputBorder};
          border-radius: 8px; padding: 10px 12px; font-family: Verdana, sans-serif; font-size: 16px; width: 100%; box-sizing: border-box;
        }
        textarea { min-height: 80px; resize: vertical; }
      `}</style>
    </main>
  );
}

function iconBtn(theme: { text: string; card: string }, border: string): CSSProperties {
  return {
    background: theme.card, color: theme.text, border, borderRadius: 8,
    width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
}

function shiftCursor(view: ViewMode, cursor: Date, set: (d: Date) => void, dir: 1 | -1) {
  const d = new Date(cursor);
  if (view === "day" || view === "list") d.setDate(d.getDate() + dir);
  else if (view === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  set(d);
}

function labelForCursor(view: ViewMode, cursor: Date) {
  if (view === "day" || view === "list") return fmtLong(cursor);
  if (view === "month") return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  // week
  const start = new Date(cursor); start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useSettings();
  return (
    <div>
      <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
        textTransform: "uppercase", color: theme.muted, marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 15, color: theme.text }}>{children}</div>
    </div>
  );
}

/* ---------------- VIEWS ---------------- */

type ThemeT = { text: string; bg: string; card: string; muted: string };

function ReminderBlock({ r, time, onClick, appearance }: {
  r: Reminder; time: string; onClick: () => void; appearance: "light" | "dark";
}) {
  const color = TYPE_COLOR[r.type];
  const bg = reminderBg(r.type, appearance);
  const fg = appearance === "dark" ? "#FFFFFF" : "#1A1A2E";
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
      background: bg, color: fg, border: `1px solid ${color}`, borderRadius: 4,
      padding: "6px 8px", cursor: "pointer", fontFamily: "Verdana, sans-serif", fontSize: 13,
    }}>
      <span style={{ fontWeight: 700, minWidth: 44 }}>{time}</span>
      {iconForType(r.type, 14, color)}
      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.name}</span>
      {r.type === "medication" && r.dose != null && <span style={{ opacity: 0.85, fontSize: 12 }}>- {r.dose} pill{r.dose > 1 ? "s" : ""}</span>}
    </button>
  );
}

function hours() { return Array.from({ length: 17 }, (_, i) => 6 + i); } // 6..22

function formatHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr} ${period}`;
}

function DayView({ date, reminders, onOpen, onAdd, theme, appearance, gridLine }: {
  date: Date; reminders: Reminder[]; onOpen: (r: Reminder) => void; onAdd: () => void;
  theme: ThemeT; appearance: "light" | "dark"; gridLine: string;
}) {
  const items = reminders.filter((r) => appliesOn(r, date));
  return (
    <div style={{ display: "grid" }}>
      {hours().map((h) => {
        const hh = String(h).padStart(2, "0");
        const slot = items.flatMap((r) => r.times.filter((t) => t.startsWith(hh)).map((t) => ({ r, t })));
        return (
          <div key={h}
            onClick={() => slot.length === 0 && onAdd()}
            style={{
              display: "grid", gridTemplateColumns: "70px 1fr",
              minHeight: 60, borderBottom: `1px solid ${gridLine}`,
              background: theme.card, cursor: slot.length === 0 ? "pointer" : "default",
            }}>
            <div style={{ color: theme.muted, fontSize: 13, padding: "8px 8px 0 0", textAlign: "right",
              fontFamily: "'Trebuchet MS', sans-serif" }}>{formatHour(h)}</div>
            <div style={{ padding: 6, display: "grid", gap: 4, alignContent: "center" }}>
              {slot.map(({ r, t }, i) => (
                <ReminderBlock key={r.id + t + i} r={r} time={t} onClick={() => onOpen(r)} appearance={appearance} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ date, reminders, onOpen, theme, appearance, gridLine }: {
  date: Date; reminders: Reminder[]; onOpen: (r: Reminder) => void;
  theme: ThemeT; appearance: "light" | "dark"; gridLine: string;
}) {
  const start = new Date(date); start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `60px repeat(7, minmax(90px, 1fr))`, minWidth: 760 }}>
        <div style={{ borderBottom: `1px solid ${gridLine}` }} />
        {days.map((d, i) => (
          <div key={d.toISOString()} style={{
            textAlign: "center", padding: "8px 4px",
            borderLeft: i === 0 ? "none" : `1px solid ${gridLine}`,
            borderBottom: `1px solid ${gridLine}`,
            fontFamily: "Georgia, serif", fontWeight: 700,
          }}>
            <div style={{ fontSize: 14 }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
            <div style={{ color: theme.muted, fontSize: 13, fontFamily: "Verdana, sans-serif", fontWeight: 400 }}>{d.getDate()}</div>
          </div>
        ))}
        {hours().map((h) => {
          const hh = String(h).padStart(2, "0");
          return (
            <Fragment key={`row-${h}`}>
              <div style={{ color: theme.muted, fontSize: 12, padding: "8px 8px 0 0", textAlign: "right",
                borderBottom: `1px solid ${gridLine}`, fontFamily: "'Trebuchet MS', sans-serif", minHeight: 60 }}>
                {formatHour(h)}
              </div>
              {days.map((d, di) => {
                const items = reminders.filter((r) => appliesOn(r, d))
                  .flatMap((r) => r.times.filter((t) => t.startsWith(hh)).map((t) => ({ r, t })));
                return (
                  <div key={`c-${h}-${d.toISOString()}`} style={{
                    background: theme.card,
                    borderLeft: di === 0 ? "none" : `1px solid ${gridLine}`,
                    borderBottom: `1px solid ${gridLine}`,
                    minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center",
                    flexWrap: "wrap", gap: 4, padding: 4,
                  }}>
                    {items.map(({ r }, i) => {
                      const color = TYPE_COLOR[r.type];
                      const bg = reminderBg(r.type, appearance);
                      return (
                        <button key={r.id + i} onClick={() => onOpen(r)} title={`${r.name} - ${r.times.join(", ")}`}
                          aria-label={r.name}
                          style={{
                            width: 26, height: 26, borderRadius: 4, background: bg,
                            border: `1px solid ${color}`, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
                          }}>
                          {iconForType(r.type, 14, color)}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ date, reminders, onPickDay, theme, gridLine }: {
  date: Date; reminders: Reminder[]; onPickDay: (d: Date) => void;
  theme: ThemeT; gridLine: string;
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(date.getFullYear(), date.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", fontWeight: 700,
        fontFamily: "Georgia, serif", textAlign: "center", marginBottom: 1 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ color: theme.muted, fontSize: 13, padding: "6px 0",
            borderBottom: `1px solid ${gridLine}` }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((c, i) => {
          if (!c) return <div key={i} style={{ background: theme.bg, minHeight: 80,
            border: `1px solid ${gridLine}`, marginLeft: -1, marginTop: -1 }} />;
          const dayReminders = reminders.filter((r) => appliesOn(r, c));
          return (
            <button key={i} onClick={() => onPickDay(c)} style={{
              background: theme.card, border: `1px solid ${gridLine}`, marginLeft: -1, marginTop: -1,
              minHeight: 80, padding: 8, textAlign: "left", color: theme.text, cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{c.getDate()}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {dayReminders.slice(0, 6).map((r, idx) => (
                  <span key={r.id + idx} style={{
                    width: 9, height: 9, borderRadius: "50%", background: TYPE_COLOR[r.type],
                  }} />
                ))}
                {dayReminders.length > 6 && <span style={{ fontSize: 11, color: theme.muted }}>+{dayReminders.length - 6}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ reminders, onOpen, onEdit, onDelete, theme, appearance, gridLine, panelBg }: {
  reminders: Reminder[]; onOpen: (r: Reminder) => void;
  onEdit: (r: Reminder) => void; onDelete: (r: Reminder) => void;
  theme: ThemeT; appearance: "light" | "dark"; gridLine: string; panelBg: string;
}) {
  if (reminders.length === 0) return <div style={{ color: theme.muted, padding: 16 }}>No reminders yet. Add one to get started.</div>;
  const headTd: CSSProperties = {
    padding: "12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase",
    fontFamily: "'Trebuchet MS', sans-serif", color: theme.text, textAlign: "left",
    borderBottom: `1px solid ${theme.text}`,
  };
  const bodyTd: CSSProperties = {
    padding: 12, fontSize: 13, color: theme.text, borderBottom: `1px solid ${gridLine}`,
    height: 48, verticalAlign: "middle",
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: panelBg }}>
          <tr>
            <th style={headTd}>Reminder</th>
            <th style={headTd}>Details</th>
            <th style={headTd}>Times</th>
            <th style={headTd}>Frequency</th>
            <th style={{ ...headTd, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reminders.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} style={{ cursor: "pointer", background: theme.card }}>
              <td style={{ ...bodyTd, fontWeight: 700, fontSize: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {iconForType(r.type, 16, TYPE_COLOR[r.type])} {r.name}
                </span>
              </td>
              <td style={{ ...bodyTd, color: theme.muted }}>
                {r.type === "medication" ? `${r.dose ?? 1} pill${(r.dose ?? 1) > 1 ? "s" : ""}` : (r.details || "—")}
              </td>
              <td style={bodyTd}>{r.times.join(", ")}</td>
              <td style={bodyTd}>{r.repeatSchedule}</td>
              <td style={{ ...bodyTd, textAlign: "right" }}>
                <span style={{ display: "inline-flex", gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(r); }} aria-label="Edit"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 4 }}>
                    <Edit size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(r); }} aria-label="Delete"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: RED, padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* ---------------- MODALS ---------------- */

function ModalShell({ children, onClose, width = 720 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  const { theme, cardBorder } = useSettings();
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: theme.card, color: theme.text, border: cardBorder, borderRadius: 8,
        width: "90%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", padding: 24, position: "relative",
        fontFamily: "Verdana, sans-serif", lineHeight: 1.5,
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 12, right: 12, background: "transparent", border: "none",
          color: theme.text, cursor: "pointer", padding: 6,
        }}><X size={22} /></button>
        {children}
      </div>
    </div>
  );
}

function CategoryPicker({ onClose, onPick }: { onClose: () => void; onPick: (t: ReminderType) => void }) {
  const { theme, buttonBorder } = useSettings();
  const options: { type: ReminderType; sub: string }[] = [
    { type: "medication", sub: "Pills, drops, injections" },
    { type: "appointment", sub: "Doctor, specialist, visit" },
    { type: "activity", sub: "Walks, meals, calls" },
    { type: "other", sub: "Anything they shouldn't forget" },
  ];
  return (
    <ModalShell onClose={onClose}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 24 }}>What kind of reminder?</h2>
      <p style={{ color: theme.muted, marginTop: 6 }}>Pick one to keep things simple.</p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        {options.map((o) => (
          <button key={o.type} onClick={() => onPick(o.type)} style={{
            background: theme.bg, color: theme.text, border: buttonBorder, borderRadius: 8,
            padding: 16, textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <span style={{ marginTop: 2 }}>{iconForType(o.type, 24, TYPE_COLOR[o.type])}</span>
            <span>
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "Georgia, serif" }}>{TYPE_LABEL[o.type]}</div>
              <div style={{ fontSize: 14, color: theme.muted }}>{o.sub}</div>
            </span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function NumberStepper({ value, onChange, min = 1, max = 20 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const { theme, buttonBorder } = useSettings();
  const btn: CSSProperties = { background: theme.bg, color: theme.text, border: buttonBorder, borderRadius: 8,
    width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" style={btn} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <input type="number" value={value} min={min} max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value || "1", 10))))}
        style={{ width: 80, textAlign: "center" }} />
      <button type="button" style={btn} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={16} /></button>
    </div>
  );
}

function ReminderForm({ initial, existing, onClose, onSave, onDelete }: {
  initial: Reminder; existing: boolean;
  onClose: () => void; onSave: (r: Reminder) => void; onDelete: (r: Reminder) => void;
}) {
  const { theme, buttonBorder } = useSettings();
  const [r, setR] = useState<Reminder>(initial);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDoseWarn, setShowDoseWarn] = useState(false);

  const nameLabel = r.type === "medication" ? "Medication name" : r.type === "appointment" ? "Appointment name" : r.type === "activity" ? "Activity name" : "Reminder name";

  const setTimesCount = (n: number) => {
    const times = [...r.times];
    while (times.length < n) times.push("12:00");
    times.length = n;
    setR({ ...r, timesPerDay: n, times });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!r.name.trim()) e.name = "This field is required";
    if (!r.timesPerDay || r.timesPerDay < 1) e.timesPerDay = "This field is required";
    if (!r.times.length || r.times.some((t) => !t)) e.times = "This field is required";
    if (r.repeats !== false) {
      if (!r.repeatSchedule) e.repeatSchedule = "This field is required";
      if (r.repeatSchedule === "Monthly" && !(r.monthlyDates ?? []).length) {
        e.monthlyDates = "Please select at least one date";
      }
      if (r.repeatSchedule === "Custom" && !(r.customDays ?? []).length) {
        e.customDays = "Please select at least one day of the week";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const trySave = () => {
    if (!validate()) return;
    if (r.type === "medication" && (r.dose ?? 0) > 3) { setShowDoseWarn(true); return; }
    onSave({ ...r, updatedAt: new Date().toISOString() });
  };

  const labelStyle: CSSProperties = { fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
    color: theme.text, display: "block", marginBottom: 6 };
  const errStyle: CSSProperties = { color: RED, fontSize: 13, marginTop: 4 };
  const sectionGap: CSSProperties = { display: "grid", gap: 14 };

  const detailsPlaceholder = r.type === "appointment" ? "Location, doctor, room…" : r.type === "activity" ? "What to do" : "Details";

  return (
    <>
      <ModalShell onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {iconForType(r.type, 24, TYPE_COLOR[r.type])}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>{existing ? "Edit" : "New"} {TYPE_LABEL[r.type]}</div>
            <div style={{ fontSize: 14, color: theme.muted }}>Fill in the details below.</div>
          </div>
        </div>

        <div style={sectionGap}>
          <div>
            <label style={labelStyle}>{nameLabel} <span style={{ color: RED }}>*</span></label>
            <input type="text" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })}
              style={errors.name ? { borderColor: RED } : undefined} />
            {errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>

          {r.type === "medication" ? (
            <div>
              <label style={labelStyle}>Dose (pills)</label>
              <NumberStepper value={r.dose ?? 1} onChange={(n) => setR({ ...r, dose: n })} min={1} max={20} />
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Details</label>
              <input type="text" value={r.details ?? ""} placeholder={detailsPlaceholder}
                onChange={(e) => setR({ ...r, details: e.target.value })} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Times per day <span style={{ color: RED }}>*</span></label>
            <NumberStepper value={r.timesPerDay} onChange={setTimesCount} min={1} max={8} />
            {errors.timesPerDay && <div style={errStyle}>{errors.timesPerDay}</div>}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {r.times.map((t, i) => (
              <div key={i}>
                <label style={labelStyle}>
                  {r.times.length === 1 ? "Time" : `${ordinal(i + 1)} time`} <span style={{ color: RED }}>*</span>
                </label>
                <input type="time" value={t} onChange={(e) => {
                  const arr = [...r.times]; arr[i] = e.target.value; setR({ ...r, times: arr });
                }} />
              </div>
            ))}
            {errors.times && <div style={errStyle}>{errors.times}</div>}
          </div>

          <RepeatScheduleField r={r} setR={setR} errors={errors} />


          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value })} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={trySave} style={{
            background: GREEN, color: "#fff", border: "none", padding: "12px 18px",
            borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700,
            fontSize: 16, cursor: "pointer", width: "100%",
          }}>Save</button>
          <button type="button" onClick={onClose} style={{
            background: "transparent", color: theme.text, border: buttonBorder, padding: "12px 18px",
            borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%",
          }}>Cancel</button>
          {existing && (
            <button type="button" onClick={() => onDelete(r)} style={{
              background: "transparent", color: RED, border: `2px solid ${RED}`, padding: "12px 18px",
              borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%",
            }}>Delete</button>
          )}
        </div>
      </ModalShell>

      {showDoseWarn && (
        <ModalShell onClose={() => setShowDoseWarn(false)} width={460}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={28} color="#F59E0B" />
            <div>
              <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>
                Are you sure you want to prescribe {r.dose} pills?
              </h3>
              <p style={{ color: theme.muted, marginTop: 6 }}>That's a high dose. Please double-check before saving.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button onClick={() => setShowDoseWarn(false)} style={{
              background: "transparent", color: theme.text, border: buttonBorder, padding: "10px 16px",
              borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => { setShowDoseWarn(false); onSave({ ...r, updatedAt: new Date().toISOString() }); }} style={{
              background: GREEN, color: "#fff", border: "none", padding: "10px 16px",
              borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
            }}>Confirm</button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ViewReminderModal({ reminder, onClose, onEdit, onDelete }: {
  reminder: Reminder; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { theme, buttonBorder } = useSettings();
  return (
    <ModalShell onClose={onClose} width={520}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {iconForType(reminder.type, 22, TYPE_COLOR[reminder.type])}
        <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>{reminder.name}</h2>
      </div>
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{reminder.times[0]}</div>
        <div style={{ color: theme.muted, fontSize: 14 }}>Repeats: {reminder.repeatSchedule}</div>
        {reminder.times.length > 1 && (
          <div style={{ color: theme.muted, fontSize: 14 }}>All times: {reminder.times.join(", ")}</div>
        )}
        {reminder.type === "medication" && reminder.dose != null && (
          <div style={{ fontSize: 15 }}>Dose: {reminder.dose} pill{reminder.dose > 1 ? "s" : ""}</div>
        )}
        {reminder.details && <div style={{ fontSize: 15 }}>{reminder.details}</div>}
        {reminder.notes && <div style={{ fontStyle: "italic", color: theme.muted, fontSize: 14 }}>{reminder.notes}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onDelete} style={{
          background: "transparent", color: RED, border: `2px solid ${RED}`, padding: "10px 16px",
          borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}><Trash2 size={16} /> Delete</button>
        <button onClick={onEdit} style={{
          background: theme.text, color: theme.card, border: "none", padding: "10px 16px",
          borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}><Edit size={16} /> Edit</button>
      </div>
    </ModalShell>
  );
}

function ConfirmDelete({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  const { theme, buttonBorder } = useSettings();
  return (
    <ModalShell onClose={onCancel} width={460}>
      <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>Delete "{name}"?</h3>
      <p style={{ color: theme.muted, marginTop: 6 }}>This cannot be undone.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          background: "transparent", color: theme.text, border: buttonBorder, padding: "10px 16px",
          borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
        }}>Cancel</button>
        <button onClick={onConfirm} style={{
          background: RED, color: "#fff", border: "none", padding: "10px 16px",
          borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, cursor: "pointer",
        }}>Delete</button>
      </div>
    </ModalShell>
  );
}
