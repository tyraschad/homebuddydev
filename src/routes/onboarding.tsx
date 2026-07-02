import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft, Check, Upload, Camera, Edit,
  User, HeartPulse, CheckCircle2,
  Glasses, Brain, EyeOff as Blind, Sparkles, Ear, Palette, VolumeX,
} from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, type Contact } from "@/lib/carer-store";
import { GradientBackground } from "@/components/GradientBackground";
import { HomebuddyWordmark } from "@/components/homebuddy-wordmark";


export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "HomeBuddy Onboarding" }] }),
});

const GREEN = "#519D46";
const STORAGE_KEY = "homebuddy.onboarding.v2";
const TOTAL = 5;

type Condition =
  | "Low Vision" | "MCI" | "Blindness" | "Alzheimer's"
  | "Hearing loss w/ aid" | "Hearing loss w/o aid" | "Colorblindness" | "Deaf";

type OnbData = {
  step: number;
  carerName: string;
  elderName: string;
  elderAge: string;
  elderPhoto?: string;
  elderNotes: string;
  conditions: Condition[];
  settingLargerText: boolean;
  settingReadAloud: boolean;
  settingRemindersLarger: boolean;
  // kept for backward compatibility with v2 localStorage payloads — UI no longer touches these
  reminders: unknown[];
  devices: unknown[];
  contacts: unknown[];
  emergencyVisible: { ems: boolean; poison: boolean };
};

const DEFAULT_DATA: OnbData = {
  step: 1,
  carerName: "",
  elderName: "",
  elderAge: "",
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
  "Low Vision": <Glasses size={28} />,
  "MCI": <Brain size={28} />,
  "Blindness": <Blind size={28} />,
  "Alzheimer's": <Sparkles size={28} />,
  "Hearing loss w/ aid": <Ear size={28} />,
  "Hearing loss w/o aid": <Ear size={28} />,
  "Colorblindness": <Palette size={28} />,
  "Deaf": <VolumeX size={28} />,
};

const ALL_CONDITIONS: Condition[] = [
  "Low Vision", "MCI", "Blindness", "Alzheimer's",
  "Hearing loss w/ aid", "Hearing loss w/o aid", "Colorblindness", "Deaf",
];


function Onboarding() {
  const { theme, cardBorder, buttonBorder, inputBorder, appearance } = useSettings();
  const navigate = useNavigate();
  const { setElder, elder } = useCarer();

  const [data, setData] = useState<OnbData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OnbData;
        // Clamp step to new TOTAL — legacy users mid-flow land on the new Review page with data intact.
        const merged: OnbData = {
          ...DEFAULT_DATA,
          ...parsed,
          step: Math.max(1, Math.min(TOTAL, parsed.step || 1)),
        };
        if (merged.step > 1) {
          setData(merged);
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
    fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5,
    display: "flex", flexDirection: "column",
    position: "relative", zIndex: 1,
  };
  const container: CSSProperties = {
    maxWidth: 880, width: "100%", margin: "0 auto", padding: 24, boxSizing: "border-box",
    flex: 1, display: "flex", flexDirection: "column",
  };
  const h1: CSSProperties = { fontFamily: "Newsreader, serif", fontWeight: 700, fontSize: 28, color: theme.text, margin: "0 0 8px" };
  const h2: CSSProperties = { fontFamily: "Newsreader, serif", fontWeight: 700, fontSize: 20, color: theme.text, margin: "0 0 12px" };
  const muted: CSSProperties = { fontSize: 14, color: theme.muted, lineHeight: 1.5 };
  const small: CSSProperties = { fontSize: 12, color: theme.muted };
  const btnPrimary = (disabled = false): CSSProperties => ({
    background: disabled ? "#C9C4BC" : GREEN, color: "#fff", border: "none",
    height: 48, padding: "0 24px", borderRadius: 8,
    fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.9 : 1,
  });
  const btnSecondary: CSSProperties = {
    background: "#FFFFFF", color: theme.text, border: "1px solid #E0DBD0",
    height: 44, padding: "0 20px", borderRadius: 999,
    fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
  };
  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: inputBorder, borderRadius: 6, background: theme.card, color: theme.text,
    fontFamily: "Inter, system-ui, sans-serif", fontSize: 14,
  };
  const card: CSSProperties = {
    background: theme.card, border: cardBorder, borderRadius: 12, padding: 16,
  };

  // ---- Header (back + progress; status display, not clickable) ----
  const renderHeader = () => {
    if (data.step === 1) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => goto(data.step - 1)}
            style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 8, height: 40 }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div style={{ ...small, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Progress
          </div>
          <div style={{ ...small, fontWeight: 700, minWidth: 56, textAlign: "right" }}>
            {data.step - 1} of {TOTAL - 1}
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL - 1}
          aria-valuenow={data.step - 1}
          aria-label="Onboarding progress"
          style={{ height: 8, background: "#E5DFD0", borderRadius: 4, overflow: "hidden", cursor: "default" }}
        >
          <div style={{
            width: `${((data.step - 1) / (TOTAL - 1)) * 100}%`, height: "100%", background: GREEN,
            transition: "width 200ms ease",
          }} />
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
    const ageNum = parseInt(data.elderAge, 10);
    const newElder = {
      id: elder.id || "elder-1",
      name: data.elderName.trim() || "Elder",
      dob: elder.dob || "",
      age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : undefined,
      avatar: data.elderPhoto || elder.avatar,
      conditions: data.conditions,
      contacts: [] as Contact[],
      notes: data.elderNotes,
      context: "",
      devices: [],
    };
    setElder(newElder);

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem("homebuddy.onboarding.completed.v1", "1");
      // Also clear tour-completed so the portal tour runs after fresh onboarding.
      localStorage.removeItem("homebuddy.tour.completed.v1");
    } catch {}
  };

  const startOver = () => {
    setData({ ...DEFAULT_DATA });
    setResumePrompt(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (!hydrated) return <main style={page} />;

  const gradientOverlay = <GradientBackground opacity={0.132} style={{ zIndex: 2 }} />;

  if (resumePrompt) {
    return (
      <>
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
        {gradientOverlay}
      </>
    );
  }

  // Stacked-on-mobile two-column grid for the combined About page.
  const aboutGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginTop: 24,
  };

  return (
    <>
      <main style={page}>
        <div style={container}>
          {renderHeader()}

          {/* ===== PAGE 1: WELCOME (animated wordmark) ===== */}
          {data.step === 1 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 0" }}>
              <HomebuddyWordmark />
              <p style={{ ...muted, fontSize: 16, margin: "20px 0 0" }}>Custom care for elders at home</p>
              <p style={{ ...muted, maxWidth: 420, marginTop: 16 }}>
                Set up a personalised care ecosystem for your loved one in just a few minutes.
              </p>
              <div style={{ width: "100%", maxWidth: 420, marginTop: 32 }}>
                <p style={{ ...small, fontFamily: "Newsreader, serif", fontStyle: "italic", fontSize: 14, marginBottom: 12 }}>
                  Don't worry — you can change any of this later.
                </p>
                <button type="button" onClick={() => goto(2)} style={{ ...btnPrimary(), width: "100%" }}>
                  Get started
                </button>
              </div>
            </div>
          )}

          {/* ===== PAGE 2: HOW IT WORKS ===== */}
          {data.step === 2 && (
            <div>
              <h1 style={h1}>How HomeBuddy Works</h1>
              <p style={muted}>
                Setup takes just a couple of minutes. You can edit anything later.
              </p>
              <ol
                className="hb-stepper"
                role="list"
                aria-label="Setup steps overview"
                style={{ listStyle: "none" }}
              >
                <StepNode icon={<User size={22} color="#fff" />} title="About you" body="Tell us who you are and who you're caring for." text={theme.text} muted={theme.muted} />
                <StepNode icon={<HeartPulse size={22} color="#fff" />} title="Their needs" body="Pick the conditions that apply." text={theme.text} muted={theme.muted} />
                <StepNode icon={<CheckCircle2 size={22} color="#fff" />} title="Review & launch" body="Confirm the setup and we'll personalise the app." text={theme.text} muted={theme.muted} />
              </ol>
              <p style={{ ...small, fontStyle: "italic", marginTop: 16 }}>
                Don't worry — you can change any of this later.
              </p>
              {navButtons()}
            </div>
          )}

          {/* ===== PAGE 3: COMBINED ABOUT ===== */}
          {data.step === 3 && (
            <div>
              <h1 style={h1}>Tell us about you and your loved one</h1>
              <p style={muted}>We'll personalise everything based on this information.</p>
              <div style={aboutGrid}>
                {/* LEFT: Carer */}
                <div style={card}>
                  <h2 style={h2}>Fill out information about you</h2>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                    Your name (carer) <span style={{ color: "#C0392B" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    value={data.carerName}
                    onChange={(e) => update({ carerName: e.target.value })}
                    placeholder="e.g., Sarah"
                  />
                </div>

                {/* RIGHT: Elder */}
                <div style={card}>
                  <h2 style={h2}>About the person you're caring for</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                        Their age
                      </label>
                      <input
                        style={inputStyle}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={130}
                        value={data.elderAge}
                        onChange={(e) => update({ elderAge: e.target.value.replace(/[^\d]/g, "") })}
                        placeholder="e.g., 82"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                        Notes (optional)
                      </label>
                      <textarea style={{ ...inputStyle, minHeight: 96, resize: "vertical" }} rows={4}
                        value={data.elderNotes}
                        onChange={(e) => update({ elderNotes: e.target.value })}
                        placeholder="Likes, dislikes, routines, anything helpful…" />
                    </div>
                  </div>
                </div>
              </div>
              {navButtons(!data.carerName.trim() || !data.elderName.trim())}
            </div>
          )}

          {/* ===== PAGE 4: NEEDS ASSESSMENT ===== */}
          {data.step === 4 && (
            <div>
              <h1 style={h1}>Needs Assessment</h1>
              <p style={muted}>
                Choosing these conditions will help us adjust settings according to specific needs. Select all conditions that apply to {elderName}.
              </p>
              <p style={small}>Pick at least one</p>
              <div className="hb-needs-grid">
                {ALL_CONDITIONS.map((c) => {
                  const selected = data.conditions.includes(c);
                  return (
                    <button key={c} type="button"
                      onClick={() => update({
                        conditions: selected ? data.conditions.filter((x) => x !== c) : [...data.conditions, c],
                      })}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 8, padding: 12, borderRadius: 8,
                        aspectRatio: "1 / 1",
                        background: selected ? "#CBE894" : theme.card,
                        border: selected ? `2px solid ${GREEN}` : cardBorder,
                        color: theme.text, cursor: "pointer", textAlign: "center",
                        fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, fontWeight: 600,
                        position: "relative", boxSizing: "border-box",
                      }}>
                      <div>{CONDITION_ICONS[c]}</div>
                      <span>{c}</span>
                      {selected && (
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          width: 22, height: 22, borderRadius: "50%", background: GREEN,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Check size={14} color="#fff" />
                        </div>
                      )}
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

          {/* ===== PAGE 5: REVIEW + ECOSYSTEM ===== */}
          {data.step === 5 && (
            <div>
              <h1 style={h1}>{elderName}'s HomeBuddy</h1>
              <p style={muted}>Everything is set up. Review and edit anything below.</p>

              {/* Profile summary card (inline edit) */}
              <div style={{ ...card, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: "50%", border: cardBorder, overflow: "hidden",
                      background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {data.elderPhoto
                        ? <img src={data.elderPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Camera size={24} color={theme.muted} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 20, color: theme.text, fontFamily: "Newsreader, serif" }}>
                        {data.elderName || "—"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {data.conditions.map((c) => (
                          <span key={c} style={{
                            fontSize: 12, padding: "2px 8px", borderRadius: 12,
                            background: theme.bg, border: cardBorder, color: theme.text,
                          }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProfile((v) => !v)}
                    style={{ ...btnSecondary, height: 36, padding: "0 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Edit size={14} /> {editingProfile ? "Done" : "Edit"}
                  </button>
                </div>

                {data.elderNotes && !editingProfile && (
                  <div style={{ fontSize: 14, color: theme.muted, marginTop: 12 }}>{data.elderNotes}</div>
                )}

                {editingProfile && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16, paddingTop: 16, borderTop: cardBorder }}>
                    <PhotoField
                      label="Photo"
                      photo={data.elderPhoto}
                      onPhoto={(p) => update({ elderPhoto: p })}
                      theme={theme} cardBorder={cardBorder} buttonBorder={buttonBorder}
                    />
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Their name</label>
                      <input style={inputStyle} value={data.elderName}
                        onChange={(e) => update({ elderName: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Notes</label>
                      <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} rows={3}
                        value={data.elderNotes}
                        onChange={(e) => update({ elderNotes: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Conditions</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {ALL_CONDITIONS.map((c) => {
                          const selected = data.conditions.includes(c);
                          return (
                            <button key={c} type="button"
                              onClick={() => update({
                                conditions: selected ? data.conditions.filter((x) => x !== c) : [...data.conditions, c],
                              })}
                              style={{
                                padding: "6px 12px", borderRadius: 999,
                                background: selected ? GREEN : theme.card,
                                color: selected ? "#fff" : theme.text,
                                border: selected ? `1px solid ${GREEN}` : cardBorder,
                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                              }}>{c}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested ecosystem */}
              <h3 style={{ ...h2, marginTop: 24 }}>Suggested ecosystem</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestRecommendations(data.conditions).map((r, i) => (
                  <div key={i} style={card}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: theme.text, marginBottom: 4 }}>
                      {r.title}
                    </div>
                    <div style={muted}>{r.desc}</div>
                  </div>
                ))}
              </div>

              {/* Adjusted settings */}
              <h3 style={{ ...h2, marginTop: 24 }}>We've also adjusted these settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ToggleRow label="Larger text on every screen" value={data.settingLargerText}
                  onChange={(v) => update({ settingLargerText: v })} theme={theme} cardBorder={cardBorder} />
                <ToggleRow label="Read-aloud turned on" value={data.settingReadAloud}
                  onChange={(v) => update({ settingReadAloud: v })} theme={theme} cardBorder={cardBorder} />
                <ToggleRow label="Reminders shown larger" value={data.settingRemindersLarger}
                  onChange={(v) => update({ settingRemindersLarger: v })} theme={theme} cardBorder={cardBorder} />
              </div>
              <p style={{ ...small, marginTop: 16 }}>You can adjust any of these later in Settings.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => { handleFinish(); navigate({ to: "/carer" }); }} style={{ ...btnPrimary(), width: "100%" }}>
                  View your portal
                </button>
                <button type="button" onClick={() => { handleFinish(); navigate({ to: "/elder" }); }} style={{ ...btnSecondary, width: "100%", height: 48 }}>
                  View the screen {elderName} will see
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      {gradientOverlay}
    </>
  );
}

// ---------- Subcomponents ----------

function HowCard({ icon, title, body, appearance, card, text, muted }: {
  icon: ReactNode; title: string; body: string; appearance: string;
  card: CSSProperties; text: string; muted: string;
}) {
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: 20 }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: appearance === "dark" ? "#3A3A4E" : "#F0F0F0",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>{icon}</div>
      <div style={{ fontFamily: "Newsreader, serif", fontWeight: 700, fontSize: 17, color: text, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: muted, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
}

function StepNode({ icon, title, body, text, muted }: {
  icon: ReactNode; title: string; body: string; text: string; muted: string;
}) {
  return (
    <li className="hb-stepper-item">
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: "#519D46",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 0 4px #fff",
      }}>{icon}</div>
      <div style={{ fontFamily: "Newsreader, serif", fontWeight: 700, fontSize: 16, color: text, marginTop: 12, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: muted, lineHeight: 1.4 }}>{body}</div>
    </li>
  );
}


function PhotoField({ label, photo, onPhoto, theme, cardBorder, buttonBorder }: {
  label: string; photo?: string; onPhoto: (p: string) => void;
  theme: { bg: string; muted: string; text: string }; cardBorder: string; buttonBorder: string;
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
          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 14,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <Upload size={16} /> {photo ? "Change photo" : "Upload photo"}
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              const src = String(reader.result);
              const img = new Image();
              img.onload = () => {
                const MAX = 1024;
                const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement("canvas");
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) { onPhoto(src); return; }
                ctx.drawImage(img, 0, 0, w, h);
                try { onPhoto(canvas.toDataURL("image/jpeg", 0.8)); }
                catch { onPhoto(src); }
              };
              img.onerror = () => onPhoto(src);
              img.src = src;
            };
            reader.readAsDataURL(f);
          }} />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange, theme, cardBorder }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  theme: { card: string; text: string }; cardBorder: string;
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
        background: value ? GREEN : "#BBBBB0", position: "relative", cursor: "pointer",
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
