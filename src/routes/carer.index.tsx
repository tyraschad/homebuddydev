import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, X,
  Edit, Trash2, Settings as SettingsIcon,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import {
  useCarer, type Reminder, type ReminderType, type ElderProfile, type Contact, type Device,
  TYPE_COLOR, TYPE_LABEL, reminderBg,
} from "@/lib/carer-store";
import {
  GREEN, RED, WEEKDAY_SHORT, WEEKDAY_LONG,
  ymd, uid, ordinal, iconForType,
  ModalShell as Modal, CategoryPicker, NumberStepper, ReminderForm,
} from "@/components/reminder-form";
import { DeviceListEditor } from "@/components/instruction-context-form";
import { PortalTour, hasCompletedTour, type TourStep } from "@/components/portal-tour";



export const Route = createFileRoute("/carer/")({
  component: CarerPortal,
  head: () => ({ meta: [{ title: "Carer Portal" }] }),
});

type ViewMode = "day" | "week" | "month" | "list";

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
  const { elder, setElder, reminders, addReminder, updateReminder, deleteReminder } = useCarer();

  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date | null>(null);
  const [profileOpen, setProfileOpen] = useState(true);
  const [icOpen, setIcOpen] = useState(true);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [headerDate, setHeaderDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setCursor(now);
    setHeaderDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [viewing, setViewing] = useState<Reminder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null);
  const [dayPopup, setDayPopup] = useState<Date | null>(null);
  const [editTarget, setEditTarget] = useState<"conditions" | "notes" | "contacts" | "devices" | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const profileRef = useRef<HTMLElement | null>(null);
  const icRef = useRef<HTMLElement | null>(null);
  const scheduleRef = useRef<HTMLElement | null>(null);
  const calendarRef = useRef<HTMLElement | null>(null);
  const todayBtnRef = useRef<HTMLButtonElement | null>(null);

  const today = new Date();
  const isToday = cursor != null && ymd(cursor) === ymd(today);

  // Determine if "today" is within the currently viewed range
  const viewingToday = (() => {
    if (!cursor) return true;
    if (view === "day" || view === "list") return ymd(cursor) === ymd(today);
    if (view === "month") return cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
    if (view === "week") {
      const start = new Date(cursor); start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const t = ymd(today);
      return t >= ymd(start) && t <= ymd(end);
    }
    return false;
  })();

  // Auto-launch tour on first visit (once elder data loaded)
  useEffect(() => {
    if (!cursor) return;
    if (!hasCompletedTour()) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [cursor]);

  const panelBg = appearance === "dark" ? "#2A2A3E" : "#F5F0E8";
  const gridLine = appearance === "dark" ? "#555555" : "#CCCCCC";

  const headerStyle: CSSProperties = {
    background: panelBg, padding: 16,
    display: "grid", gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center", gap: 16, borderBottom: cardBorder,
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

  const editPencil = (onClick: () => void, label: string): CSSProperties => ({});

  const handleGoToday = () => setCursor(new Date());

  const tourSteps: TourStep[] = [
    { ref: headerRef, title: "Welcome to the Carer Portal", body: "Manage reminders, contacts, and settings for your loved one from here." },
    { ref: profileRef, title: "Elder Profile", body: `View and edit ${elder.name}'s health conditions, notes, and phone contacts.` },
    { ref: icRef, title: "Instruction Context", body: "Add devices from their home so HomeBuddy can give personalized help." },
    { ref: scheduleRef, title: "Schedule controls", body: "Create reminders for medication, appointments, and activities — switch between day, week, month, and list." },
    { ref: calendarRef, title: "Calendar", body: "All reminders are shown here. Tap any reminder to view or edit it." },
    
  ];

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text,
      fontFamily: "Verdana, sans-serif", lineHeight: 1.5 }}>
      {/* HEADER */}
      <header ref={headerRef} style={headerStyle}>
        <div style={{ justifySelf: "start" }}>
          <Link to="/elder" style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
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
        <div style={{ justifySelf: "end", display: "flex", gap: 8 }}>
          <Link to="/carer/settings" aria-label="Carer settings" title="Carer settings" style={{
            ...btnSecondary, padding: "10px 12px",
            display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          }}>
            <SettingsIcon size={18} />
          </Link>
        </div>
      </header>

      {/* ELDER PROFILE CARD with expandable sub-sections */}
      <section ref={profileRef} style={whiteCard}>
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, width: "100%" }}
        >
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: theme.bg, border: buttonBorder,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
            fontWeight: 700, fontSize: 24, color: theme.text, flexShrink: 0, overflow: "hidden" }}>
            {elder.avatar ? <img src={elder.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (elder.name.charAt(0) || "?")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 20, fontFamily: "Georgia, serif", color: theme.text }}>{elder.name || "Elder"}</div>
            <div style={{ fontSize: 14, color: theme.muted }}>{ageFromDob(elder.dob)}</div>
          </div>
          {profileOpen ? <ChevronUp size={20} color={theme.text} /> : <ChevronDown size={20} color={theme.text} />}
        </button>

        {profileOpen && (
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <SubSection label="Health conditions" onEdit={() => setEditTarget("conditions")}>
              {elder.conditions.length === 0 ? (
                <EmptyLine text="No health conditions added" />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {elder.conditions.map((c) => (
                    <span key={c} style={{ background: theme.bg, border: buttonBorder, borderRadius: 999,
                      padding: "4px 12px", fontSize: 12, color: theme.text, fontFamily: "'Trebuchet MS', sans-serif" }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </SubSection>

            <SubSection label="Notes" onEdit={() => setEditTarget("notes")}>
              {elder.notes ? <div>{elder.notes}</div> : <EmptyLine text="No notes added" />}
            </SubSection>

            <SubSection label="Phone contacts" onEdit={() => setEditTarget("contacts")}>
              {elder.contacts.length === 0 ? (
                <EmptyLine text="No contacts added" />
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {elder.contacts.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                      <span style={{ color: theme.muted }}>{c.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </SubSection>
          </div>
        )}
      </section>

      {/* INSTRUCTION CONTEXT CARD */}
      <section ref={icRef} style={whiteCard}>
        <button
          type="button"
          onClick={() => setIcOpen((v) => !v)}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, width: "100%" }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 20, fontFamily: "Georgia, serif", color: theme.text }}>Instruction Context</div>
            <div style={{ fontSize: 14, color: theme.muted }}>
              {elder.devices.length} device{elder.devices.length === 1 ? "" : "s"} added
            </div>
          </div>
          {icOpen && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditTarget("devices"); }}
              aria-label="Edit instruction context"
              style={{
                background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 6,
              }}
            ><Edit size={16} /></button>
          )}
          {icOpen ? <ChevronUp size={20} color={theme.text} /> : <ChevronDown size={20} color={theme.text} />}
        </button>

        {icOpen && (
          <div style={{ marginTop: 16 }}>
            {elder.devices.length === 0 ? (
              <div style={{ textAlign: "center", color: theme.muted, fontSize: 14, padding: 16 }}>
                No devices added
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {elder.devices.map((d) => {
                  const open = expandedDevices.has(d.id);
                  return (
                    <div key={d.id} style={{ border: buttonBorder, borderRadius: 8, overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setExpandedDevices((prev) => {
                          const next = new Set(prev);
                          if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                          return next;
                        })}
                        style={{
                          all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                          padding: 12, width: "100%", boxSizing: "border-box",
                        }}
                      >
                        {d.photo
                          ? <img src={d.photo} alt="" style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover" }} />
                          : <div style={{ width: 30, height: 30, borderRadius: 4, background: theme.bg, border: buttonBorder }} />}
                        <div style={{ flex: 1, fontSize: 16, color: theme.text, fontWeight: 700 }}>{d.name}</div>
                        {open ? <ChevronDown size={16} color={theme.text} /> : <ChevronRight size={16} color={theme.text} />}
                      </button>
                      {open && (
                        <div style={{ padding: 16, borderTop: buttonBorder, background: theme.bg, display: "grid", gap: 12 }}>
                          {d.photo && (
                            <div>
                              <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Device</div>
                              <img src={d.photo} alt={d.name} style={{ maxWidth: 200, width: "100%", height: "auto", border: buttonBorder, borderRadius: 4, objectFit: "contain" }} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Suggested questions</div>
                            {d.questions && d.questions.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 20, color: theme.text, fontSize: 13, fontFamily: "Verdana, sans-serif", display: "grid", gap: 4 }}>
                                {d.questions.map((q, i) => <li key={i}>{q}</li>)}
                              </ul>
                            ) : (
                              <div style={{ fontSize: 14, color: theme.muted }}>No questions added</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* SCHEDULE CONTROLS */}
      <section ref={scheduleRef} style={{ ...greyPanel, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
          <button onClick={() => cursor && shiftCursor(view, cursor, setCursor, -1)} style={iconBtn(theme, buttonBorder)}><ChevronLeft size={18} /></button>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: "center" }}>
            {cursor ? labelForCursor(view, cursor) : ""}
            {view === "day" && isToday && (
              <span style={{ marginLeft: 8, fontFamily: "Verdana, sans-serif", fontSize: 14, color: GREEN, fontWeight: 700 }}>
                — Today
              </span>
            )}
          </span>
          <button onClick={() => cursor && shiftCursor(view, cursor, setCursor, 1)} style={iconBtn(theme, buttonBorder)}><ChevronRight size={18} /></button>
        </div>
        <button onClick={() => setPickCategoryOpen(true)} style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={18} /> Add Reminder / Medication
        </button>
      </section>

      {/* CALENDAR */}
      <section ref={calendarRef} style={{ ...whiteCard, position: "relative" }}>
        {cursor && view === "day" && <DayView date={cursor} reminders={reminders} onOpen={setViewing} onAdd={() => setPickCategoryOpen(true)} theme={theme} appearance={appearance} gridLine={gridLine} />}
        {cursor && view === "week" && <WeekView date={cursor} reminders={reminders} onOpen={setViewing} theme={theme} appearance={appearance} gridLine={gridLine} />}
        {cursor && view === "month" && <MonthView date={cursor} reminders={reminders} onPickDay={(d) => setDayPopup(d)} theme={theme} appearance={appearance} gridLine={gridLine} />}
        {cursor && view === "list" && <ListView reminders={reminders} onOpen={setViewing} onEdit={(r) => setEditing(r)} onDelete={(r) => setConfirmDelete(r)} theme={theme} appearance={appearance} gridLine={gridLine} panelBg={panelBg} />}
      </section>

      {/* FLOATING GO-TO-TODAY BUTTON */}
      <button
        ref={todayBtnRef}
        type="button"
        onClick={handleGoToday}
        aria-label="Go to current date"
        style={{
          position: "fixed", bottom: 16, right: 16, height: 44, padding: "0 20px",
          background: theme.card, color: theme.text, border: cardBorder, borderRadius: 22,
          fontFamily: "Verdana, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 40,
          opacity: viewingToday ? 0 : 1,
          pointerEvents: viewingToday ? "none" : "auto",
          transition: "opacity 0.3s ease",
        }}
      >
        Go to current date
      </button>

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

      {dayPopup && (
        <DatePopup
          date={dayPopup}
          reminders={reminders.filter((r) => appliesOn(r, dayPopup))}
          onClose={() => setDayPopup(null)}
          onViewFullDay={() => { setCursor(dayPopup); setView("day"); setDayPopup(null); }}
          appearance={appearance}
        />
      )}

      {editTarget && (
        <EditSectionModal
          target={editTarget}
          elder={elder}
          onClose={() => setEditTarget(null)}
          onSave={(next) => {
            setElder(next);
            setEditTarget(null);
            setSavedToast(true);
            setTimeout(() => setSavedToast(false), 2000);
          }}
        />
      )}

      {savedToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: GREEN, color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
          zIndex: 100,
        }}>Saved</div>
      )}

      {tourOpen && <PortalTour steps={tourSteps} onClose={() => setTourOpen(false)} />}

      <style>{`
        input[type="text"], input[type="number"], input[type="time"], input[type="date"], input[type="tel"], textarea, select {
          background: ${theme.bg}; color: ${theme.text}; border: ${inputBorder};
          border-radius: 8px; padding: 10px 12px; font-family: Verdana, sans-serif; font-size: 16px; width: 100%; box-sizing: border-box;
        }
        textarea { min-height: 80px; resize: vertical; }
      `}</style>
    </main>
  );
}

function SubSection({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  const { theme } = useSettings();
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
          textTransform: "uppercase", color: theme.muted, letterSpacing: 0.5 }}>{label}</div>
        <button type="button" onClick={onEdit} aria-label={`Edit ${label}`} title={`Edit ${label}`}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 4 }}>
          <Edit size={16} />
        </button>
      </div>
      <div style={{ fontSize: 15, color: theme.text }}>{children}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  const { theme } = useSettings();
  return <span style={{ color: theme.muted, fontStyle: "italic" }}>{text}</span>;
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

type ThemeT = { text: string; bg: string; card: string; muted: string; border: string; overlay: string };





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
      {r.type === "medication" && r.dose != null && (
        <span style={{ fontSize: 14, color: appearance === "dark" ? "#B0B0B0" : "#6B6860" }}>
          Dose: {r.dose} Pill{r.dose > 1 ? "s" : ""} │
        </span>
      )}
      <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.name}</span>
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
  const todayStr = ymd(new Date());
  const todayBg = appearance === "dark" ? "#2A3A4A" : "#F0F4FF";
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `60px repeat(7, minmax(90px, 1fr))`, minWidth: 760 }}>
        <div style={{ borderBottom: `1px solid ${gridLine}` }} />
        {days.map((d, i) => {
          const isTodayCol = ymd(d) === todayStr;
          return (
            <div key={d.toISOString()} style={{
              textAlign: "center", padding: "8px 4px",
              borderLeft: i === 0 ? "none" : `1px solid ${gridLine}`,
              borderBottom: `1px solid ${gridLine}`,
              fontFamily: "Georgia, serif", fontWeight: 700,
              background: isTodayCol ? todayBg : "transparent",
            }}>
              {isTodayCol && (
                <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, textTransform: "uppercase",
                  letterSpacing: 0.5, fontFamily: "'Trebuchet MS', sans-serif", marginBottom: 2 }}>
                  Today
                </div>
              )}
              <div style={{ fontSize: 14 }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div style={{ color: theme.muted, fontSize: 13, fontFamily: "Verdana, sans-serif", fontWeight: 400 }}>{d.getDate()}</div>
            </div>
          );
        })}
        {hours().map((h) => {
          const hh = String(h).padStart(2, "0");
          return (
            <Fragment key={`row-${h}`}>
              <div style={{ color: theme.muted, fontSize: 12, padding: "8px 8px 0 0", textAlign: "right",
                borderBottom: `1px solid ${gridLine}`, fontFamily: "'Trebuchet MS', sans-serif", minHeight: 60 }}>
                {formatHour(h)}
              </div>
              {days.map((d, di) => {
                const isTodayCol = ymd(d) === todayStr;
                const items = reminders.filter((r) => appliesOn(r, d))
                  .flatMap((r) => r.times.filter((t) => t.startsWith(hh)).map((t) => ({ r, t })));
                return (
                  <div key={`c-${h}-${d.toISOString()}`} style={{
                    background: isTodayCol ? todayBg : theme.card,
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


function MonthView({ date, reminders, onPickDay, theme, appearance, gridLine }: {
  date: Date; reminders: Reminder[]; onPickDay: (d: Date) => void;
  theme: ThemeT; appearance: "light" | "dark"; gridLine: string;
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(date.getFullYear(), date.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayStr = ymd(new Date());
  const todayBg = appearance === "dark" ? "#2A3A4A" : "#F0F4FF";
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
          const isTodayCell = ymd(c) === todayStr;
          return (
            <button key={i} onClick={() => onPickDay(c)} style={{
              background: isTodayCell ? todayBg : theme.card,
              border: isTodayCell ? `2px solid ${GREEN}` : `1px solid ${gridLine}`,
              marginLeft: -1, marginTop: -1,
              minHeight: 80, padding: 8, textAlign: "left", color: theme.text, cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 6, position: "relative",
            }}>
              <span style={{ fontWeight: isTodayCell ? 700 : 700, fontSize: 14,
                color: isTodayCell ? GREEN : theme.text }}>{c.getDate()}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {dayReminders.slice(0, 6).map((r, idx) => (
                  <span key={r.id + idx} style={{
                    width: 9, height: 9, borderRadius: "50%", background: TYPE_COLOR[r.type],
                  }} />
                ))}
                {dayReminders.length > 6 && <span style={{ fontSize: 11, color: theme.muted }}>+{dayReminders.length - 6}</span>}
              </div>
              {isTodayCell && (
                <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 8,
                  fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: 0.5,
                  fontFamily: "'Trebuchet MS', sans-serif" }}>today</span>
              )}
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



function ViewReminderModal({ reminder, onClose, onEdit, onDelete }: {
  reminder: Reminder; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { theme, buttonBorder } = useSettings();
  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {iconForType(reminder.type, 22, TYPE_COLOR[reminder.type])}
        <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 20 }}>{reminder.name}</h2>
      </div>
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{reminder.times[0]}</div>
        <div style={{ color: theme.muted, fontSize: 14 }}>{formatSchedule(reminder)}</div>
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
    </Modal>
  );
}

function ConfirmDelete({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  const { theme, buttonBorder } = useSettings();
  return (
    <Modal onClose={onCancel} width={460}>
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
    </Modal>
  );
}




/* ---------------- DATE POPUP (Month view click) ---------------- */

function DatePopup({ date, reminders, onClose, onViewFullDay, appearance }: {
  date: Date; reminders: Reminder[]; onClose: () => void;
  onViewFullDay: () => void; appearance: "light" | "dark";
}) {
  const { theme } = useSettings();
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const headerStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const sorted = reminders
    .flatMap((r) => r.times.map((t) => ({ r, t })))
    .sort((a, b) => a.t.localeCompare(b.t));
  return (
    <Modal onClose={onClose} width={500}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 24, color: theme.text, paddingRight: 32 }}>
        {headerStr}
      </h2>
      <div style={{ fontSize: 16, marginTop: 12, marginBottom: 12, color: theme.text }}>
        Reminders for {dayName}
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", fontSize: 14, color: theme.muted, padding: "24px 0" }}>
          No reminders scheduled for {dayName}
        </div>
      ) : (
        <div>
          {sorted.map(({ r, t }, idx) => {
            const color = TYPE_COLOR[r.type];
            const bg = reminderBg(r.type, appearance);
            const fg = appearance === "dark" ? "#FFFFFF" : "#1A1A2E";
            return (
              <div key={r.id + t + idx} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: bg, color: fg, border: `1px solid ${color}`,
                borderRadius: 4, padding: 8, marginBottom: 12,
              }}>
                <span style={{ fontWeight: 700, minWidth: 50 }}>{t}</span>
                {iconForType(r.type, 16, color)}
                <span style={{ fontWeight: 700, flex: 1 }}>{r.name}</span>
                {r.type === "medication" && r.dose != null && (
                  <span style={{ fontSize: 13, opacity: 0.85 }}>- {r.dose} pill{r.dose > 1 ? "s" : ""}</span>
                )}
                {r.type !== "medication" && r.details && (
                  <span style={{ fontSize: 13, opacity: 0.85 }}>- {r.details}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onViewFullDay} style={{
        background: GREEN, color: "#fff", border: "none", height: 44, width: "100%",
        borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700,
        fontSize: 16, cursor: "pointer", marginTop: 8,
      }}>View full day</button>
    </Modal>
  );
}

/* ---------------- EDIT SECTION MODAL ---------------- */

function EditSectionModal({ target, elder, onClose, onSave }: {
  target: "conditions" | "notes" | "contacts" | "devices";
  elder: ElderProfile;
  onClose: () => void;
  onSave: (e: ElderProfile) => void;
}) {
  const { theme, buttonBorder } = useSettings();
  const [draft, setDraft] = useState<ElderProfile>(elder);
  const [newCondition, setNewCondition] = useState("");
  const [contactErr, setContactErr] = useState<string>("");

  const labelStyle: CSSProperties = {
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
    color: theme.text, display: "block", marginBottom: 6,
  };

  const titles: Record<typeof target, string> = {
    conditions: "Edit Health Conditions",
    notes: "Edit Notes",
    contacts: "Edit Phone Contacts",
    devices: "Edit Instruction Context",
  };

  const addCondition = () => {
    const v = newCondition.trim();
    if (!v || draft.conditions.includes(v)) { setNewCondition(""); return; }
    setDraft({ ...draft, conditions: [...draft.conditions, v] });
    setNewCondition("");
  };
  const removeCondition = (c: string) =>
    setDraft({ ...draft, conditions: draft.conditions.filter((x) => x !== c) });
  const addContact = () =>
    setDraft({ ...draft, contacts: [...draft.contacts, { id: Math.random().toString(36).slice(2, 9), name: "", phone: "" }] });
  const updateContact = (id: string, patch: Partial<Contact>) =>
    setDraft({ ...draft, contacts: draft.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const removeContact = (id: string) =>
    setDraft({ ...draft, contacts: draft.contacts.filter((c) => c.id !== id) });

  const onSubmit = () => {
    if (target === "contacts" && draft.contacts.some((c) => !c.name.trim() || !c.phone.trim())) {
      setContactErr("Please fill in both name and phone for each contact");
      return;
    }
    onSave(draft);
  };

  return (
    <Modal onClose={onClose} width={target === "devices" ? 640 : 560}>
      <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 22, paddingRight: 32 }}>
        {titles[target]}
      </h2>

      <div style={{ marginTop: 20 }}>
        {target === "conditions" && (
          <div>
            <label style={labelStyle}>Health conditions</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {draft.conditions.map((c) => (
                <span key={c} style={{
                  background: theme.bg, color: theme.text, border: buttonBorder,
                  borderRadius: 12, padding: "4px 8px", fontSize: 12,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  {c}
                  <button type="button" onClick={() => removeCondition(c)} aria-label={`Remove ${c}`}
                    style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", padding: 0 }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {draft.conditions.length === 0 && <span style={{ color: theme.muted, fontStyle: "italic" }}>No health conditions added</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={newCondition} placeholder="e.g., Diabetes"
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCondition(); } }} />
              <button type="button" onClick={addCondition} style={{
                background: theme.text, color: theme.card, border: "none", borderRadius: 8,
                padding: "0 14px", cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        )}

        {target === "notes" && (
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={draft.notes} rows={6} placeholder="e.g., Prefers tea in the morning..."
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        )}

        {target === "contacts" && (
          <div>
            <label style={labelStyle}>Phone contacts</label>
            <div style={{ display: "grid", gap: 8 }}>
              {draft.contacts.map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                  <input type="text" placeholder="Name" value={c.name}
                    onChange={(e) => updateContact(c.id, { name: e.target.value })} />
                  <input type="tel" placeholder="Phone" value={c.phone}
                    onChange={(e) => updateContact(c.id, { phone: e.target.value })} />
                  <button type="button" onClick={() => removeContact(c.id)} aria-label="Remove contact"
                    style={{
                      background: "transparent", color: theme.text, border: buttonBorder, borderRadius: 8,
                      width: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}><X size={16} /></button>
                </div>
              ))}
              {draft.contacts.length === 0 && <span style={{ color: theme.muted, fontStyle: "italic" }}>No contacts added</span>}
            </div>
            <button type="button" onClick={addContact} style={{
              marginTop: 10, background: "transparent", color: theme.text, border: buttonBorder,
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <Plus size={16} /> Add contact
            </button>
            {contactErr && <div style={{ color: RED, fontSize: 13, marginTop: 6 }}>{contactErr}</div>}
          </div>
        )}

        {target === "devices" && (
          <DeviceListEditor
            devices={draft.devices}
            onChange={(devices) => setDraft({ ...draft, devices })}
            elderName={draft.name}
          />
        )}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
        <button type="button" onClick={onSubmit} style={{
          background: GREEN, color: "#fff", border: "none",
          height: 44, borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif",
          fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%",
        }}>Save changes</button>
        <button type="button" onClick={onClose} style={{
          background: "transparent", color: theme.text, border: buttonBorder,
          height: 44, borderRadius: 8, fontFamily: "'Trebuchet MS', sans-serif",
          fontWeight: 700, fontSize: 16, cursor: "pointer", width: "100%",
        }}>Cancel</button>
      </div>
    </Modal>
  );
}


