import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState, type CSSProperties } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, X,
  Pill, Stethoscope, Activity, HelpCircle, Edit, Trash2, AlertTriangle, Minus,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import {
  useCarer, type Reminder, type ReminderType, TYPE_COLOR, TYPE_LABEL,
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

// Reminder applies on a given date based on its repeatSchedule
function appliesOn(r: Reminder, d: Date) {
  const day = d.getDay(); // 0 Sun ... 6 Sat
  switch (r.repeatSchedule) {
    case "Daily": return true;
    case "Weekdays": return day >= 1 && day <= 5;
    case "Weekends": return day === 0 || day === 6;
    case "Weekly": return true; // simplified
    case "Monthly": return d.getDate() === 1; // simplified
    default: return true;
  }
}

function CarerPortal() {
  const { theme, cardBorder, buttonBorder, inputBorder } = useSettings();
  const { elder, reminders, addReminder, updateReminder, deleteReminder } = useCarer();

  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [profileOpen, setProfileOpen] = useState(true);
  const [headerDate, setHeaderDate] = useState("");

  useEffect(() => {
    setHeaderDate(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null); // form modal
  const [viewing, setViewing] = useState<Reminder | null>(null); // view modal
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null);

  const today = new Date();
  const isToday = ymd(cursor) === ymd(today);

  const headerStyle: CSSProperties = {
    background: theme.card,
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
  const btnDanger: CSSProperties = {
    background: "transparent", color: RED, border: `2px solid ${RED}`,
    padding: "10px 18px", borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif",
    fontWeight: 700, fontSize: 16, cursor: "pointer",
  };

  const cardStyle: CSSProperties = {
    background: theme.card, border: cardBorder, borderRadius: 8,
    padding: 16, margin: 16,
  };

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: "Verdana, sans-serif", lineHeight: 1.5 }}>
      {/* HEADER */}
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
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
        <div style={{ justifySelf: "end" }}>
          <Link to="/carer/settings" style={{ color: theme.text, fontSize: 14, textDecoration: "underline",
            fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
            Carer Portal Settings
          </Link>
        </div>
      </header>

      {/* PROFILE CARD */}
      <section style={cardStyle}>
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

      {/* SCHEDULE HEADER */}
      <section style={{ ...cardStyle, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["day", "week", "month", "list"] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setView(m)} style={{
              background: view === m ? theme.text : "transparent",
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
            <button onClick={() => setCursor(new Date())} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 14 }}>Today</button>
          )}
        </div>
        <button onClick={() => setPickCategoryOpen(true)} style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={18} /> Add Reminder / Medication
        </button>
      </section>

      {/* CALENDAR VIEW */}
      <section style={cardStyle}>
        {view === "day" && <DayView date={cursor} reminders={reminders} onOpen={setViewing} theme={theme} border={buttonBorder} />}
        {view === "week" && <WeekView date={cursor} reminders={reminders} onOpen={setViewing} theme={theme} border={buttonBorder} />}
        {view === "month" && <MonthView date={cursor} reminders={reminders} onPickDay={(d) => { setCursor(d); setView("day"); }} theme={theme} border={buttonBorder} />}
        {view === "list" && <ListView reminders={reminders} onOpen={setViewing} theme={theme} border={buttonBorder} />}
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

function ReminderBlock({ r, time, onClick, border }: { r: Reminder; time: string; onClick: () => void; border: string }) {
  const color = TYPE_COLOR[r.type];
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
      background: color + "22", color: "inherit", border: `1.5px solid ${color}`, borderRadius: 6,
      padding: "6px 8px", cursor: "pointer", fontFamily: "Verdana, sans-serif", fontSize: 13,
    }}>
      <span style={{ fontWeight: 700 }}>{time}</span>
      {iconForType(r.type, 14, color)}
      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
      {r.type === "medication" && r.dose != null && <span style={{ opacity: 0.8 }}>- {r.dose} pill{r.dose > 1 ? "s" : ""}</span>}
    </button>
  );
}

function hours() { return Array.from({ length: 17 }, (_, i) => 6 + i); } // 6..22

function DayView({ date, reminders, onOpen, theme, border }: {
  date: Date; reminders: Reminder[]; onOpen: (r: Reminder) => void;
  theme: { text: string; bg: string; card: string; muted: string }; border: string;
}) {
  const items = reminders.filter((r) => appliesOn(r, date));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {hours().map((h) => {
        const hh = String(h).padStart(2, "0");
        const slot = items.flatMap((r) => r.times.filter((t) => t.startsWith(hh)).map((t) => ({ r, t })));
        return (
          <div key={h} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 8, alignItems: "stretch" }}>
            <div style={{ color: theme.muted, fontSize: 13, paddingTop: 6 }}>{hh}:00</div>
            <div style={{ background: theme.bg, border, borderRadius: 6, padding: 6, minHeight: 40, display: "grid", gap: 4 }}>
              {slot.map(({ r, t }, i) => <ReminderBlock key={r.id + t + i} r={r} time={t} onClick={() => onOpen(r)} border={border} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ date, reminders, onOpen, theme, border }: {
  date: Date; reminders: Reminder[]; onOpen: (r: Reminder) => void;
  theme: { text: string; bg: string; card: string; muted: string }; border: string;
}) {
  const start = new Date(date); start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `60px repeat(7, minmax(120px, 1fr))`, gap: 4, minWidth: 800 }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} style={{ textAlign: "center", fontFamily: "Georgia, serif", fontWeight: 700 }}>
            <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
            <div style={{ color: theme.muted, fontSize: 13 }}>{d.getDate()}</div>
          </div>
        ))}
        {hours().map((h) => {
          const hh = String(h).padStart(2, "0");
          return (
            <Fragment key={`row-${h}`}>
              <div style={{ color: theme.muted, fontSize: 12, paddingTop: 6 }}>{hh}:00</div>
              {days.map((d) => {
                const items = reminders.filter((r) => appliesOn(r, d))
                  .flatMap((r) => r.times.filter((t) => t.startsWith(hh)).map((t) => ({ r, t })));
                return (
                  <div key={`c-${h}-${d.toISOString()}`} style={{ background: theme.bg, border, borderRadius: 6, padding: 4, minHeight: 38, display: "grid", gap: 3 }}>
                    {items.map(({ r, t }, i) => <ReminderBlock key={r.id + t + i} r={r} time={t} onClick={() => onOpen(r)} border={border} />)}
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

function MonthView({ date, reminders, onPickDay, theme, border }: {
  date: Date; reminders: Reminder[]; onPickDay: (d: Date) => void;
  theme: { text: string; bg: string; card: string; muted: string }; border: string;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontWeight: 700,
        fontFamily: "Georgia, serif", textAlign: "center", marginBottom: 4 }}>
        {weekdays.map((w) => <div key={w} style={{ color: theme.muted, fontSize: 13 }}>{w}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const dayReminders = reminders.filter((r) => appliesOn(r, c));
          return (
            <button key={i} onClick={() => onPickDay(c)} style={{
              background: theme.bg, border, borderRadius: 6, minHeight: 72, padding: 6,
              textAlign: "left", color: theme.text, cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{c.getDate()}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {dayReminders.slice(0, 5).map((r) => (
                  <span key={r.id} style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[r.type] }} />
                ))}
                {dayReminders.length > 5 && <span style={{ fontSize: 11, color: theme.muted }}>+{dayReminders.length - 5}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ reminders, onOpen, theme, border }: {
  reminders: Reminder[]; onOpen: (r: Reminder) => void;
  theme: { text: string; bg: string; card: string; muted: string }; border: string;
}) {
  if (reminders.length === 0) return <div style={{ color: theme.muted }}>No reminders yet. Add one to get started.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: theme.muted, fontFamily: "'Trebuchet MS', sans-serif" }}>
            <th style={{ padding: "8px 6px" }}>Reminder</th>
            <th style={{ padding: "8px 6px" }}>Details</th>
            <th style={{ padding: "8px 6px" }}>Times</th>
            <th style={{ padding: "8px 6px" }}>Frequency</th>
            <th style={{ padding: "8px 6px" }}></th>
          </tr>
        </thead>
        <tbody>
          {reminders.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} style={{ cursor: "pointer", borderTop: border }}>
              <td style={{ padding: "10px 6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {iconForType(r.type, 16, TYPE_COLOR[r.type])} {r.name}
              </td>
              <td style={{ padding: "10px 6px", color: theme.muted }}>
                {r.type === "medication" ? `${r.dose ?? 1} pill${(r.dose ?? 1) > 1 ? "s" : ""}` : (r.details || "—")}
              </td>
              <td style={{ padding: "10px 6px" }}>{r.times.join(", ")}</td>
              <td style={{ padding: "10px 6px" }}>{r.repeatSchedule}</td>
              <td style={{ padding: "10px 6px", color: theme.muted, textAlign: "right" }}>›</td>
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
    if (!r.repeatSchedule) e.repeatSchedule = "This field is required";
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

          <div style={{ border: buttonBorder, borderRadius: 8, padding: 12 }}>
            <button type="button" onClick={() => setScheduleOpen((v) => !v)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%",
              fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700,
            }}>
              <span style={{ flex: 1 }}>Repeat &amp; schedule <span style={{ color: RED }}>*</span></span>
              {scheduleOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {scheduleOpen && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Daily", "Weekdays", "Weekends", "Weekly", "Monthly", "Custom"].map((s) => (
                  <button key={s} type="button" onClick={() => setR({ ...r, repeatSchedule: s })} style={{
                    background: r.repeatSchedule === s ? theme.text : "transparent",
                    color: r.repeatSchedule === s ? theme.card : theme.text,
                    border: buttonBorder, borderRadius: 999, padding: "6px 14px", cursor: "pointer",
                    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
                  }}>{s}</button>
                ))}
              </div>
            )}
            {r.repeatSchedule === "Custom" && (
              <input type="text" placeholder="Describe schedule (e.g., every Tue & Thu)"
                value={r.notes ?? ""} onChange={(e) => setR({ ...r, notes: e.target.value })}
                style={{ marginTop: 10 }} />
            )}
            {errors.repeatSchedule && <div style={errStyle}>{errors.repeatSchedule}</div>}
          </div>

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
