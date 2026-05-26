import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft, Check, Plus, X, Edit, Trash2, Upload, Eye, EyeOff, Camera,
  Home as HomeIcon, Glasses, Brain, EyeOff as Blind, Sparkles, Ear, Palette, VolumeX,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, type Reminder, type ReminderType, type Contact, type Device } from "@/lib/carer-store";
import { CategoryPicker, ReminderForm, uid } from "@/components/reminder-form";
import { DeviceListEditor } from "@/components/instruction-context-form";


export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "HomeBuddy Onboarding" }] }),
});

const GREEN = "#2F8F4E";
const STORAGE_KEY = "homebuddy.onboarding.v2";
const TOTAL = 10;

type Condition =
  | "Low Vision" | "MCI" | "Blindness" | "Alzheimer's"
  | "Hearing loss w/ aid" | "Hearing loss w/o aid" | "Colorblindness" | "Deaf";

type OnbReminder = Reminder;

type OnbDevice = Device;


type OnbContact = { id: string; name: string; phone: string; visible: boolean };

type OnbData = {
  step: number;
  carerName: string;
  elderName: string;
  elderPhoto?: string;
  elderNotes: string;
  conditions: Condition[];
  settingLargerText: boolean;
  settingReadAloud: boolean;
  settingRemindersLarger: boolean;
  reminders: OnbReminder[];
  devices: OnbDevice[];
  contacts: OnbContact[];
  emergencyVisible: { ems: boolean; poison: boolean };
};

const DEFAULT_DATA: OnbData = {
  step: 1,
  carerName: "",
  elderName: "",
  elderNotes: "",
  conditions: [],
  settingLargerText: true,
  settingReadAloud: true,
  settingRemindersLarger: true,
  reminders: [],
  devices: [],
  contacts: [],
  emergencyVisible: { ems: true, poison: true },
};

const CONDITION_ICONS: Record<Condition, ReactNode> = {
  "Low Vision": <Glasses size={24} />,
  "MCI": <Brain size={24} />,
  "Blindness": <Blind size={24} />,
  "Alzheimer's": <Sparkles size={24} />,
  "Hearing loss w/ aid": <Ear size={24} />,
  "Hearing loss w/o aid": <Ear size={24} />,
  "Colorblindness": <Palette size={24} />,
  "Deaf": <VolumeX size={24} />,
};

const ALL_CONDITIONS: Condition[] = [
  "Low Vision", "MCI", "Blindness", "Alzheimer's",
  "Hearing loss w/ aid", "Hearing loss w/o aid", "Colorblindness", "Deaf",
];



function Onboarding() {
  const { theme, cardBorder, buttonBorder, inputBorder, appearance, sizes } = useSettings();
  const navigate = useNavigate();
  const { setElder, elder, reminders: existingReminders, addReminder, setReminders: _ignored } = useCarer() as any;

  const [data, setData] = useState<OnbData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OnbData;
        if (parsed.step > 1) {
          setData(parsed);
          setResumePrompt(true);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data, hydrated]);

  const update = (patch: Partial<OnbData>) => setData((d) => ({ ...d, ...patch }));
  const goto = (step: number) => update({ step: Math.max(1, Math.min(TOTAL, step)) });

  const elderName = data.elderName.trim() || "your loved one";

  // ---- Styles ----
  const page: CSSProperties = {
    minHeight: "100vh", background: theme.bg, color: theme.text,
    fontFamily: "Verdana, sans-serif", lineHeight: 1.5,
    display: "flex", flexDirection: "column",
  };
  const container: CSSProperties = {
    maxWidth: 720, width: "100%", margin: "0 auto", padding: 24, boxSizing: "border-box",
    flex: 1, display: "flex", flexDirection: "column",
  };
  const h1: CSSProperties = { fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 28, color: theme.text, margin: "0 0 8px" };
  const muted: CSSProperties = { fontSize: 14, color: theme.muted, lineHeight: 1.5 };
  const small: CSSProperties = { fontSize: 12, color: theme.muted };
  const btnPrimary = (disabled = false): CSSProperties => ({
    background: disabled ? "#9CC2A9" : GREEN, color: "#fff", border: "none",
    height: 48, padding: "0 24px", borderRadius: 8,
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1,
  });
  const btnSecondary: CSSProperties = {
    background: "transparent", color: theme.text, border: buttonBorder,
    height: 44, padding: "0 20px", borderRadius: 8,
    fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
  };
  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: inputBorder, borderRadius: 6, background: theme.card, color: theme.text,
    fontFamily: "Verdana, sans-serif", fontSize: 14,
  };
  const card: CSSProperties = {
    background: theme.card, border: cardBorder, borderRadius: 8, padding: 16,
  };

  // ---- Header (back + progress) ----
  const renderHeader = () => {
    if (data.step === 1) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => goto(data.step - 1)}
          style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 8, height: 40 }}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ flex: 1, marginLeft: 16, marginRight: 16 }}>
          <div style={{ height: 6, background: appearance === "dark" ? "#3A3A4E" : "#E8E8E8", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${((data.step - 1) / (TOTAL - 1)) * 100}%`, height: "100%", background: GREEN,
              transition: "width 200ms ease",
            }} />
          </div>
        </div>
        <div style={{ ...small, fontWeight: 700, minWidth: 56, textAlign: "right" }}>
          {data.step - 1} of {TOTAL - 1}
        </div>
      </div>
    );
  };

  const navButtons = (nextDisabled = false, onNext?: () => void, nextLabel = "Next") => (
    <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => { if (nextDisabled) return; if (onNext) onNext(); else goto(data.step + 1); }}
        style={btnPrimary(nextDisabled)}
      >
        {nextLabel}
      </button>
    </div>
  );

  // ---- Finish ----
  const handleFinish = () => {
    const newElder = {
      id: elder.id || "elder-1",
      name: data.elderName.trim() || "Elder",
      dob: elder.dob || "",
      avatar: data.elderPhoto || elder.avatar,
      conditions: data.conditions,
      contacts: [
        ...data.contacts.filter((c) => c.visible).map<Contact>((c) => ({ id: c.id, name: c.name, phone: c.phone })),
        ...(data.emergencyVisible.ems ? [{ id: "ems", name: "Emergency Services", phone: "911" }] : []),
        ...(data.emergencyVisible.poison ? [{ id: "poison", name: "Poison Control", phone: "1-800-222-1222" }] : []),
      ],
      notes: data.elderNotes,
      context: "",
      devices: data.devices,
    };
    setElder(newElder);

    data.reminders.forEach((r) => {
      addReminder({ ...r, elderId: newElder.id });
    });

    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };


  // Cleared resume
  const startOver = () => {
    setData({ ...DEFAULT_DATA });
    setResumePrompt(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (!hydrated) return <main style={page} />;

  // Resume prompt
  if (resumePrompt) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={{ ...card, marginTop: 48 }}>
            <h2 style={h1}>Welcome back</h2>
            <p style={muted}>
              You have an incomplete setup in progress. Resume from page {data.step}?
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setResumePrompt(false)} style={btnPrimary()}>Continue setup</button>
              <button type="button" onClick={startOver} style={btnSecondary}>Start over</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        {renderHeader()}

        {/* ===== PAGE 1: WELCOME ===== */}
        {data.step === 1 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: appearance === "dark" ? "#3A3A4E" : "#F0F0F0",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}>
              <HomeIcon size={48} color={GREEN} strokeWidth={1.5} />
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 36, margin: 0, color: theme.text }}>
              HomeBuddy
            </h1>
            <p style={{ ...muted, fontSize: 16, margin: "12px 0 0" }}>Custom care for elders at home</p>
            <p style={{ ...muted, maxWidth: 420, marginTop: 16 }}>
              Set up a personalised care ecosystem for your loved one in just a few minutes.
            </p>
            <button type="button" onClick={() => goto(2)} style={{ ...btnPrimary(), marginTop: 32, minWidth: 200 }}>
              Get started
            </button>
          </div>
        )}

        {/* ===== PAGE 2: HOW IT WORKS ===== */}
        {data.step === 2 && (
          <div>
            <h1 style={h1}>How HomeBuddy Works</h1>
            <p style={muted}>
              Setup takes a few minutes and is grouped into three short sections. You can edit anything later.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
              <SectionCard title="Part 1 · About you" card={card} text={theme.text}
                bullets={["Your name", "Who you're caring for", "A photo and any notes"]} />
              <SectionCard title="Part 2 · Your care plan" card={card} text={theme.text}
                bullets={["Health and accessibility needs", "Daily reminders", "Devices around the home"]} />
              <SectionCard title="Part 3 · Finishing up" card={card} text={theme.text}
                bullets={["Phone contacts", "Review and launch"]} />
            </div>
            <p style={{ ...small, fontStyle: "italic", marginTop: 16 }}>
              Don't worry — you can change any of this later.
            </p>
            {navButtons()}
          </div>
        )}

        {/* ===== PAGE 3: CARER NAME ===== */}
        {data.step === 3 && (
          <div>
            <h1 style={h1}>Part 1 · About you</h1>
            <p style={{ fontSize: 18, color: theme.muted, marginTop: 4 }}>
              First, let us know who's setting this up.
            </p>
            <div style={{ marginTop: 24 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                Your name (carer) <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={data.carerName}
                onChange={(e) => update({ carerName: e.target.value })}
                placeholder="e.g., Sarah"
              />
              {!data.carerName.trim() && (
                <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>
                  Please enter your name
                </div>
              )}
            </div>
            {navButtons(!data.carerName.trim())}
          </div>
        )}

        {/* ===== PAGE 4: ELDER PROFILE ===== */}
        {data.step === 4 && (
          <div>
            <h1 style={h1}>Tell us about the person you are caring for</h1>
            <p style={muted}>We'll personalise everything based on their needs.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24 }}>
              <PhotoField
                label="Photo (optional)"
                photo={data.elderPhoto}
                onPhoto={(p) => update({ elderPhoto: p })}
                theme={theme} cardBorder={cardBorder} buttonBorder={buttonBorder}
              />
              <div>
                <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                  Their name <span style={{ color: "#C0392B" }}>*</span>
                </label>
                <input style={inputStyle} value={data.elderName}
                  onChange={(e) => update({ elderName: e.target.value })} placeholder="e.g., Joe" />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                  Notes about the person (optional)
                </label>
                <textarea style={{ ...inputStyle, minHeight: 96, resize: "vertical" }} rows={4}
                  value={data.elderNotes}
                  onChange={(e) => update({ elderNotes: e.target.value })}
                  placeholder="Likes, dislikes, routines, anything helpful…" />
              </div>
            </div>
            {navButtons(!data.elderName.trim())}
          </div>
        )}

        {/* ===== PAGE 5: NEEDS ASSESSMENT ===== */}
        {data.step === 5 && (
          <div>
            <h1 style={h1}>Needs Assessment</h1>
            <p style={muted}>Select all conditions that apply to {elderName}.</p>
            <p style={small}>Pick at least one</p>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16,
            }}>
              {ALL_CONDITIONS.map((c) => {
                const selected = data.conditions.includes(c);
                return (
                  <button key={c} type="button"
                    onClick={() => update({
                      conditions: selected ? data.conditions.filter((x) => x !== c) : [...data.conditions, c],
                    })}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: 12, borderRadius: 8,
                      background: selected ? (appearance === "dark" ? "#166534" : "#E8F5E9") : theme.card,
                      border: cardBorder,
                      color: theme.text, cursor: "pointer", textAlign: "left",
                      fontFamily: "Verdana, sans-serif", fontSize: 14, fontWeight: 600,
                      position: "relative",
                    }}>
                    {CONDITION_ICONS[c]}
                    <span style={{ flex: 1 }}>{c}</span>
                    {selected && <Check size={18} color={GREEN} />}
                  </button>
                );
              })}
            </div>
            <div style={{ ...small, marginTop: 12 }}>
              Selected: {data.conditions.length} condition{data.conditions.length === 1 ? "" : "s"}
            </div>
            {data.conditions.length === 0 && (
              <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>
                Please select at least one condition
              </div>
            )}
            {navButtons(data.conditions.length === 0)}
          </div>
        )}

        {/* ===== PAGE 6: SUGGESTED ECOSYSTEM ===== */}
        {data.step === 6 && (
          <div>
            <h1 style={h1}>{elderName}'s suggested ecosystem</h1>
            <p style={muted}>Based on what you told us, here's what we recommend.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {suggestRecommendations(data.conditions).map((r, i) => (
                <div key={i} style={card}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: theme.text, marginBottom: 4 }}>
                    {r.title}
                  </div>
                  <div style={muted}>{r.desc}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 8 }}>
              We've also adjusted these settings
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ToggleRow label="Larger text on every screen" value={data.settingLargerText}
                onChange={(v) => update({ settingLargerText: v })} theme={theme} cardBorder={cardBorder} />
              <ToggleRow label="Read-aloud turned on" value={data.settingReadAloud}
                onChange={(v) => update({ settingReadAloud: v })} theme={theme} cardBorder={cardBorder} />
              <ToggleRow label="Reminders shown larger" value={data.settingRemindersLarger}
                onChange={(v) => update({ settingRemindersLarger: v })} theme={theme} cardBorder={cardBorder} />
            </div>
            <p style={{ ...small, marginTop: 16 }}>You can adjust any of these later in Settings.</p>
            {navButtons()}
          </div>
        )}

        {/* ===== PAGE 7A: REMINDERS ===== */}
        {data.step === 7 && (
          <RemindersPage
            data={data} update={update} elderName={elderName}
            theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary}
            inputStyle={inputStyle} h1={h1} muted={muted}
            onNext={() => goto(8)}
          />
        )}

        {/* ===== PAGE 7B: INSTRUCTION CONTEXT (DEVICES) — step 8 ===== */}
        {data.step === 8 && (
          <DevicesPage
            data={data} update={update} elderName={elderName}
            theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary}
            inputStyle={inputStyle} h1={h1} muted={muted}
            cardBorder={cardBorder} buttonBorder={buttonBorder}
            onNext={() => goto(9)}
          />
        )}

        {/* ===== PAGE 8: PHONE NUMBERS — step 9 ===== */}
        {data.step === 9 && (
          <PhoneNumbersPage
            data={data} update={update} elderName={elderName}
            theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary}
            inputStyle={inputStyle} h1={h1} muted={muted}
            onNext={() => goto(10)}
          />
        )}

        {/* ===== PAGE 9: READY & REVIEW — step 10 ===== */}
        {data.step === 10 && (
          <div>
            <h1 style={h1}>{elderName}'s HomeBuddy is ready!</h1>
            <p style={muted}>Everything is set up. You can edit anytime.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <SummaryProfile data={data} card={card} theme={theme} cardBorder={cardBorder} />
              <SummarySection
                title="Reminders" count={data.reminders.length} card={card} theme={theme}
                lines={data.reminders.map((r) => `${r.times?.[0] || "—"} · ${r.name}`)}
              />
              <SummarySection
                title="Instruction Context" count={data.devices.length} card={card} theme={theme}
                lines={data.devices.map((d) => d.name)}
              />

              <ContactsSummaryCard
                data={data} card={card} theme={theme} cardBorder={cardBorder} appearance={appearance}
              />
            </div>
            <p style={{ ...small, marginTop: 16 }}>You can edit any of this from your care portal anytime.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => { handleFinish(); navigate({ to: "/carer" }); }} style={{ ...btnPrimary(), width: "100%" }}>
                View your portal
              </button>
              <button type="button" onClick={() => { handleFinish(); navigate({ to: "/" }); }} style={{ ...btnSecondary, width: "100%", height: 48 }}>
                View the screen {elderName} will see
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- Subcomponents ----------

function SectionCard({ title, bullets, card, text }: { title: string; bullets: string[]; card: CSSProperties; text: string }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 18, color: text, marginBottom: 8 }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, color: text, fontSize: 14 }}>
        {bullets.map((b) => <li key={b} style={{ marginBottom: 4 }}>{b}</li>)}
      </ul>
    </div>
  );
}

function PhotoField({ label, photo, onPhoto, theme, cardBorder, buttonBorder }: {
  label: string; photo?: string; onPhoto: (p: string) => void;
  theme: any; cardBorder: string; buttonBorder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", border: cardBorder,
          background: theme.bg, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={24} color={theme.muted} />}
        </div>
        <button type="button" onClick={() => ref.current?.click()} style={{
          border: buttonBorder, background: "transparent", color: theme.text,
          borderRadius: 8, height: 40, padding: "0 16px", cursor: "pointer",
          fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 14,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <Upload size={16} /> {photo ? "Change photo" : "Upload photo"}
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => onPhoto(String(reader.result));
            reader.readAsDataURL(f);
          }} />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange, theme, cardBorder }: {
  label: string; value: boolean; onChange: (v: boolean) => void; theme: any; cardBorder: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: 12, border: cardBorder, borderRadius: 8, background: theme.card,
    }}>
      <span style={{ fontSize: 14, color: theme.text }}>{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{
        width: 50, height: 28, borderRadius: 14, border: "none", padding: 0,
        background: value ? GREEN : "#888", position: "relative", cursor: "pointer",
        transition: "background 200ms ease", flexShrink: 0,
      }}>
      <span style={{
        position: "absolute", top: 2, left: value ? 24 : 2,
        width: 24, height: 24, borderRadius: "50%", background: "#fff",
        transition: "left 200ms ease",
      }} />
    </button>
  );
}

function suggestRecommendations(conditions: Condition[]) {
  const recs: { title: string; desc: string }[] = [];
  const has = (c: Condition) => conditions.includes(c);
  if (has("Hearing loss w/o aid") || has("Deaf")) {
    recs.push({ title: "Wearable Audio Device", desc: "A discreet wearable that amplifies speech and important alerts." });
  }
  if (has("MCI") || has("Alzheimer's")) {
    recs.push({ title: "Step-by-step Reminders", desc: "Reminders broken into small, easy steps with friendly prompts." });
  }
  if (has("Low Vision") || has("Blindness") || has("Colorblindness")) {
    recs.push({ title: "Large Text & Voice Guides", desc: "Bigger text everywhere plus spoken guidance for every screen." });
  }
  if (recs.length === 0) {
    recs.push({ title: "Daily Reminders", desc: "Gentle, predictable reminders for medications and routines." });
    recs.push({ title: "Simple Home Screen", desc: "A calm, uncluttered screen with only what matters most." });
  }
  return recs;
}

// ---------- Reminders Page ----------
function RemindersPage({ data, update, elderName, theme, card, btnPrimary, btnSecondary, h1, muted, onNext }: any) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const blankReminder = (type: ReminderType): Reminder => ({
    id: uid(), type, name: "",
    timesPerDay: 1, times: ["08:00"],
    repeats: true, repeatSchedule: "Daily",
    elderId: "elder-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const onSave = (r: Reminder) => {
    const list = data.reminders as Reminder[];
    const exists = list.some((x) => x.id === r.id);
    update({ reminders: exists ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r] });
    setEditing(null);
  };
  const onDelete = (r: Reminder) => {
    update({ reminders: (data.reminders as Reminder[]).filter((x) => x.id !== r.id) });
    setEditing(null);
  };

  return (
    <div>
      <h1 style={h1}>Set reminders for {elderName}</h1>
      <p style={muted}>Anything {elderName} shouldn't forget — medication, appointments, daily routines.</p>
      <div style={{ ...muted, marginTop: 8 }}>
        {data.reminders.length} reminder{data.reminders.length === 1 ? "" : "s"} so far
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {data.reminders.length === 0 ? (
          <div style={{ ...muted, textAlign: "center", padding: 16 }}>No reminders yet</div>
        ) : (
          (data.reminders as Reminder[]).map((r) => (
            <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, color: theme.text, fontSize: 14 }}>
                <strong>{r.times[0]}</strong> · {r.name} · <span style={{ color: theme.muted }}>{r.repeats === false ? "Does not repeat" : r.repeatSchedule}</span>
              </div>
              <button type="button" onClick={() => setEditing(r)} style={iconBtn(theme)} aria-label="Edit"><Edit size={16} /></button>
              <button type="button" onClick={() => onDelete(r)} style={iconBtn(theme)} aria-label="Delete"><Trash2 size={16} /></button>
            </div>
          ))
        )}
      </div>

      <button type="button" onClick={() => setPicking(true)} style={{ ...btnSecondary, marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Plus size={16} /> Add a reminder
      </button>

      {picking && (
        <CategoryPicker
          onClose={() => setPicking(false)}
          onPick={(t) => { setPicking(false); setEditing(blankReminder(t)); }}
        />
      )}

      {editing && (
        <ReminderForm
          initial={editing}
          existing={(data.reminders as Reminder[]).some((x) => x.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}

      <div style={{ marginTop: 32 }}>
        <button type="button" onClick={onNext} style={btnPrimary()}>Next</button>
      </div>
    </div>
  );
}


// ---------- Devices Page (uses shared DeviceListEditor) ----------
function DevicesPage({ data, update, theme, btnPrimary, h1, muted, onNext, elderName }: any) {
  return (
    <div>
      <h1 style={h1}>Instruction Context</h1>
      <p style={muted}>Photograph devices in their home. We'll identify them and create helpful shortcuts for common questions.</p>
      <p style={{ ...muted, marginTop: 12 }}>
        When {elderName} asks a question via voice or text, HomeBuddy will use these devices to provide specific, helpful instructions. For example, if they ask "How do I change the channel?", HomeBuddy knows they have a TV remote and can guide them step-by-step.
      </p>

      <div style={{ marginTop: 16 }}>
        <DeviceListEditor
          devices={data.devices as Device[]}
          onChange={(devices) => update({ devices })}
          elderName={elderName}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <button type="button" onClick={onNext} style={btnPrimary()}>Next</button>
      </div>
    </div>
  );
}


// ---------- Phone Numbers Page ----------
function PhoneNumbersPage({ data, update, elderName, theme, card, btnPrimary, btnSecondary, inputStyle, h1, muted, onNext }: any) {
  const contacts = data.contacts as OnbContact[];
  const setContacts = (cs: OnbContact[]) => update({ contacts: cs });

  return (
    <div>
      <h1 style={h1}>Phone Numbers</h1>
      <p style={muted}>Add key contacts for {elderName}. These will appear on the Phone screen.</p>

      <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 8 }}>Main Contacts</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {contacts.map((c, i) => (
          <div key={c.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
            <input style={inputStyle} placeholder="e.g., Sarah (Daughter)" value={c.name}
              onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
            <input style={inputStyle} type="tel" placeholder="e.g., 604-555-1234" value={c.phone}
              onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: theme.text }}>
                <Toggle value={c.visible} onChange={(v) => setContacts(contacts.map((x, j) => j === i ? { ...x, visible: v } : x))} />
                {c.visible ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={14} /> Visible</span>
                  : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><EyeOff size={14} /> Hidden</span>}
              </label>
              <button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                style={iconBtn(theme)} aria-label="Delete"><X size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button"
        onClick={() => setContacts([...contacts, { id: uid(), name: "", phone: "", visible: true }])}
        style={{ ...btnSecondary, marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Plus size={16} /> Add contact
      </button>

      <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, marginTop: 24, marginBottom: 8 }}>Emergency</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <EmergencyRow label="Emergency Services" phone="911" visible={data.emergencyVisible.ems}
          onToggle={(v: boolean) => update({ emergencyVisible: { ...data.emergencyVisible, ems: v } })}
          card={card} theme={theme} />
        <EmergencyRow label="Poison Control" phone="1-800-222-1222" visible={data.emergencyVisible.poison}
          onToggle={(v: boolean) => update({ emergencyVisible: { ...data.emergencyVisible, poison: v } })}
          card={card} theme={theme} />
      </div>

      <div style={{ marginTop: 32 }}>
        <button type="button" onClick={onNext} style={btnPrimary()}>Next</button>
      </div>
    </div>
  );
}

function EmergencyRow({ label, phone, visible, onToggle, card, theme }: any) {
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{label}</div>
        <div style={{ fontSize: 14, color: theme.muted }}>{phone}</div>
      </div>
      <Toggle value={visible} onChange={onToggle} />
    </div>
  );
}

function SummaryProfile({ data, card, theme, cardBorder }: any) {
  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", border: cardBorder, overflow: "hidden",
          background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {data.elderPhoto
            ? <img src={data.elderPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <Camera size={20} color={theme.muted} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: theme.text, fontFamily: "Georgia, serif" }}>
            {data.elderName || "—"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {data.conditions.map((c: string) => (
              <span key={c} style={{
                fontSize: 12, padding: "2px 8px", borderRadius: 12,
                background: theme.bg, border: cardBorder, color: theme.text,
              }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
      {data.elderNotes && (
        <div style={{ fontSize: 14, color: theme.muted, marginTop: 12 }}>{data.elderNotes}</div>
      )}
    </div>
  );
}

function SummarySection({ title, count, lines, card, theme }: any) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, fontSize: 16, color: theme.text, fontFamily: "Georgia, serif" }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: theme.muted, marginTop: 4 }}>
        {count} {title.toLowerCase().includes("reminder") ? "reminders added"
          : title.toLowerCase().includes("device") ? "devices added"
          : title.toLowerCase().includes("contact") ? "contacts added" : "items"}
      </div>
      {lines.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: theme.text, fontSize: 14 }}>
          {lines.map((l: string, i: number) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}

function ContactsSummaryCard({ data, card, theme, cardBorder, appearance }: any) {
  const mainContacts = (data.contacts as OnbContact[]).filter((c) => c.name.trim());
  const emergency: string[] = [
    ...(data.emergencyVisible.ems ? ["Emergency Services"] : []),
    ...(data.emergencyVisible.poison ? ["Poison Control"] : []),
  ];
  const sectionTitle: CSSProperties = {
    fontWeight: 700, fontSize: 16, color: theme.text, fontFamily: "Georgia, serif",
  };
  const countLine: CSSProperties = { fontSize: 14, color: theme.muted, marginTop: 4 };
  const listStyle: CSSProperties = { margin: "8px 0 0", paddingLeft: 20, color: theme.text, fontSize: 14 };
  const emergencyBg = appearance === "dark" ? "#3A3A4E" : "#F5F0E8";
  return (
    <div style={card}>
      <div style={sectionTitle}>Phone Contacts</div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>Main Contacts</div>
        <div style={countLine}>
          {mainContacts.length} contact{mainContacts.length === 1 ? "" : "s"} added
        </div>
        {mainContacts.length > 0 && (
          <ul style={listStyle}>
            {mainContacts.map((c) => <li key={c.id}>{c.name}</li>)}
          </ul>
        )}
      </div>
      <div style={{
        marginTop: 16, padding: 12, borderRadius: 6,
        background: emergencyBg, border: cardBorder,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>Emergency Contacts</div>
        <div style={countLine}>
          {emergency.length} emergency number{emergency.length === 1 ? "" : "s"}
        </div>
        {emergency.length > 0 && (
          <ul style={listStyle}>
            {emergency.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function iconBtn(theme: any): CSSProperties {
  return {
    background: "transparent", border: "none", cursor: "pointer", color: theme.text,
    padding: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}

function Modal({ children, onClose, theme, card }: { children: ReactNode; onClose: () => void; theme: any; card: CSSProperties }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: theme.overlay,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...card, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}
