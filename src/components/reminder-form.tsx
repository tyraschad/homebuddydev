import { useState, type CSSProperties } from "react";
import {
  X, Plus, Minus, Pill, Stethoscope, Activity, HelpCircle,
  AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useSettings, type Theme } from "@/lib/settings-store";
import { TYPE_COLOR, TYPE_LABEL, DEFAULT_ANNOUNCEMENT_OFFSETS, type Reminder, type ReminderType } from "@/lib/carer-store";

export const GREEN = "#2F8F4E";
export const RED = "#C0392B";
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ThemeT = Theme;

export function ymd(d: Date) { return d.toISOString().slice(0, 10); }
export function uid() { return Math.random().toString(36).slice(2, 10); }
export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function iconForType(type: ReminderType, size = 18, color = "currentColor") {
  switch (type) {
    case "medication": return <Pill size={size} color={color} />;
    case "appointment": return <Stethoscope size={size} color={color} />;
    case "activity": return <Activity size={size} color={color} />;
    default: return <HelpCircle size={size} color={color} />;
  }
}

export function ModalShell({ children, onClose, width = 720 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
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

export function CategoryPicker({ onClose, onPick }: { onClose: () => void; onPick: (t: ReminderType) => void }) {
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

export function NumberStepper({ value, onChange, min = 1, max = 20 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
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

export function ReminderForm({ initial, existing, onClose, onSave, onDelete }: {
  initial: Reminder; existing: boolean;
  onClose: () => void; onSave: (r: Reminder) => void; onDelete?: (r: Reminder) => void;
}) {
  const { theme, buttonBorder } = useSettings();
  const [r, setR] = useState<Reminder>(initial);
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
          }}>Save reminder</button>
          <button type="button" onClick={onClose} style={{
            background: "transparent", color: theme.text, border: buttonBorder, padding: "12px 18px",
            borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%",
          }}>Cancel</button>
          {existing && onDelete && (
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

function RepeatScheduleField({ r, setR, errors }: {
  r: Reminder; setR: (r: Reminder) => void; errors: Record<string, string>;
}) {
  const { theme, buttonBorder, appearance } = useSettings();
  const repeats = r.repeats !== false;
  const offBg = appearance === "dark" ? "#4A4A4A" : "#E0E0E0";
  const accent = GREEN;
  const labelStyle: CSSProperties = {
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
    color: theme.text, display: "block", marginBottom: 6,
  };
  const errStyle: CSSProperties = { color: RED, fontSize: 12, marginTop: 6 };
  const options = ["Daily", "Weekly", "Monthly", "Weekdays", "Custom"];

  const toggle = () => {
    if (repeats) setR({ ...r, repeats: false, oneTimeDate: r.oneTimeDate ?? ymd(new Date()) });
    else setR({ ...r, repeats: true });
  };

  const pickRepeat = (s: string) => {
    const next: Reminder = { ...r, repeatSchedule: s };
    if (s === "Weekly" && next.weekday == null) next.weekday = new Date().getDay();
    if (s === "Monthly" && !(next.monthlyDates ?? []).length) next.monthlyDates = [new Date().getDate()];
    if (s === "Custom" && !(next.customDays ?? []).length) next.customDays = [];
    setR(next);
  };

  return (
    <div style={{ border: buttonBorder, borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={labelStyle}>Repeats</span>
        <button type="button" onClick={toggle} aria-pressed={repeats} style={{
          position: "relative", width: 50, height: 28, borderRadius: 14, border: "none",
          background: repeats ? accent : offBg, cursor: "pointer", padding: 0,
          transition: "background 0.2s ease",
        }}>
          <span style={{
            position: "absolute", top: 2, left: repeats ? 24 : 2,
            width: 24, height: 24, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }} />
        </button>
        <span style={{ fontSize: 14, color: theme.muted }}>{repeats ? "Repeats" : "Does not repeat"}</span>
      </div>

      {repeats && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {options.map((s) => {
              const active = r.repeatSchedule === s;
              return (
                <button key={s} type="button" onClick={() => pickRepeat(s)} style={{
                  background: active ? accent : "transparent",
                  color: active ? "#fff" : theme.text,
                  border: active ? `1.5px solid ${accent}` : buttonBorder,
                  borderRadius: 999, padding: "6px 14px", cursor: "pointer",
                  fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
                }}>{s}</button>
              );
            })}
          </div>

          {r.repeatSchedule === "Weekly" && (
            <div>
              <div style={labelStyle}>Day of week</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {WEEKDAY_LONG.map((name, idx) => {
                  const active = r.weekday === idx;
                  return (
                    <button key={name} type="button" onClick={() => setR({ ...r, weekday: idx })} style={{
                      background: active ? accent : "transparent",
                      color: active ? "#fff" : theme.text,
                      border: active ? `1.5px solid ${accent}` : buttonBorder,
                      borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                      fontFamily: "Verdana, sans-serif", fontSize: 14,
                    }}>{name}</button>
                  );
                })}
              </div>
            </div>
          )}

          {r.repeatSchedule === "Monthly" && (
            <MonthlyDatePicker selected={r.monthlyDates ?? []}
              onChange={(dates) => setR({ ...r, monthlyDates: dates })}
              error={errors.monthlyDates} theme={theme} appearance={appearance}
              buttonBorder={buttonBorder} labelStyle={labelStyle} errStyle={errStyle} accent={accent} />
          )}

          {r.repeatSchedule === "Weekdays" && (
            <div style={{ fontSize: 14, color: theme.muted }}>Mon, Tue, Wed, Thu, Fri</div>
          )}

          {r.repeatSchedule === "Custom" && (
            <CustomDayPicker selected={r.customDays ?? []}
              onChange={(days) => setR({ ...r, customDays: days })}
              error={errors.customDays} theme={theme}
              buttonBorder={buttonBorder} labelStyle={labelStyle} errStyle={errStyle} accent={accent} />
          )}

          {errors.repeatSchedule && <div style={errStyle}>{errors.repeatSchedule}</div>}
        </>
      )}
    </div>
  );
}

function MonthlyDatePicker({
  selected, onChange, error, theme, appearance, buttonBorder, labelStyle, errStyle, accent,
}: {
  selected: number[]; onChange: (d: number[]) => void; error?: string;
  theme: ThemeT; appearance: "light" | "dark"; buttonBorder: string;
  labelStyle: CSSProperties; errStyle: CSSProperties; accent: string;
}) {
  const today = new Date();
  const [m, setM] = useState(today.getMonth());
  const [y, setY] = useState(today.getFullYear());
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const grayed = appearance === "dark" ? "#555555" : "#CCCCCC";
  const monthLabel = new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const toggle = (d: number) => {
    const set = new Set(selected);
    if (set.has(d)) set.delete(d); else set.add(d);
    onChange(Array.from(set).sort((a, b) => a - b));
  };
  const shift = (dir: -1 | 1) => {
    let nm = m + dir, ny = y;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11) { nm = 0; ny++; }
    setM(nm); setY(ny);
  };
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={labelStyle}>Select dates in the month</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button type="button" onClick={() => shift(-1)} style={{
          background: "transparent", border: buttonBorder, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: theme.text,
        }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16 }}>{monthLabel}</span>
        <button type="button" onClick={() => shift(1)} style={{
          background: "transparent", border: buttonBorder, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: theme.text,
        }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, color: theme.muted, padding: 4 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d == null) {
            return <div key={`e${i}`} style={{ height: 40, border: `1px solid ${grayed}`, opacity: 0.5, borderRadius: 4, background: "transparent" }} />;
          }
          const active = selected.includes(d);
          return (
            <button key={d} type="button" onClick={() => toggle(d)} style={{
              height: 40, border: active ? `1.5px solid ${accent}` : `1px solid ${grayed}`,
              borderRadius: 4, background: active ? accent : theme.card, color: active ? "#fff" : theme.text,
              cursor: "pointer", fontFamily: "Verdana, sans-serif", fontSize: 14, fontWeight: active ? 700 : 400,
            }}>{d}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: theme.muted, marginTop: 8 }}>
        Selected: {selected.length ? selected.slice().sort((a, b) => a - b).join(", ") : "None"}
      </div>
      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

function CustomDayPicker({
  selected, onChange, error, theme, buttonBorder, labelStyle, errStyle, accent,
}: {
  selected: number[]; onChange: (d: number[]) => void; error?: string;
  theme: ThemeT; buttonBorder: string;
  labelStyle: CSSProperties; errStyle: CSSProperties; accent: string;
}) {
  const days = [
    { idx: 1, label: "Mon" }, { idx: 2, label: "Tue" }, { idx: 3, label: "Wed" },
    { idx: 4, label: "Thu" }, { idx: 5, label: "Fri" }, { idx: 6, label: "Sat" }, { idx: 0, label: "Sun" },
  ];
  const toggle = (idx: number) => {
    const set = new Set(selected);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    onChange(Array.from(set));
  };
  return (
    <div>
      <div style={labelStyle}>Select days of the week</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {days.map((d) => {
          const active = selected.includes(d.idx);
          return (
            <label key={d.idx} style={{
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.text,
            }}>
              <span onClick={() => toggle(d.idx)} style={{
                width: 16, height: 16, borderRadius: 3,
                border: active ? `1px solid ${accent}` : buttonBorder,
                background: active ? accent : theme.card,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 12, lineHeight: 1, fontWeight: 700,
              }}>{active ? "✓" : ""}</span>
              <span onClick={() => toggle(d.idx)}>{d.label}</span>
            </label>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: theme.muted, marginTop: 8 }}>
        Selected: {selected.length
          ? selected.slice().sort((a, b) => a - b).map((i) => WEEKDAY_SHORT[i]).join(", ")
          : "None"}
      </div>
      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}
