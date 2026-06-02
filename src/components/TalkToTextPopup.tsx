import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, Keyboard, Send, Sparkles, Clock, Phone, HelpCircle, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, currentTimePeriod, timeCategoryDevices, inferDeviceCategory, type Device, type Reminder } from "@/lib/carer-store";
import { useServerFn } from "@tanstack/react-start";
import { generateSteps, answerQuestion, speak, reminderChat } from "@/lib/talk.functions";

type Suggestion = {
  icon: React.ReactNode;
  label: string;
  device?: Device | null;
  reminder?: Reminder | null;
  time?: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };
type View =
  | { kind: "default" }
  | { kind: "loading"; label: string }
  | { kind: "guide"; label: string; device: Device | null; reminder: Reminder | null; steps: string[]; index: number }
  | { kind: "answer"; query: string; text: string; device: Device | null }
  | { kind: "reminderChat"; reminder: Reminder; messages: ChatMsg[]; sending: boolean; stage: "intro" | "followup" };

export function TalkToTextPopup({ onClose }: { onClose: () => void }) {
  const { theme, cardBorder, inputBorder, buttonBorder, highContrast, sizes } = useSettings();
  const { reminders, elder, bumpDeviceAccess } = useCarer();
  const callSteps = useServerFn(generateSteps);
  const callAnswer = useServerFn(answerQuestion);
  const callSpeak = useServerFn(speak);
  const callReminderChat = useServerFn(reminderChat);

  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");
  const [view, setView] = useState<View>({ kind: "default" });
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view.kind !== "default") setView({ kind: "default" });
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, view.kind]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const playTTS = async (textToRead: string) => {
    if (!voiceOn || !textToRead.trim()) return;
    try {
      audioRef.current?.pause();
      setSpeaking(true);
      const { audio, mime } = await callSpeak({ data: { text: textToRead } });
      const a = new Audio(`data:${mime};base64,${audio}`);
      audioRef.current = a;
      a.onended = () => setSpeaking(false);
      a.onerror = () => setSpeaking(false);
      await a.play();
    } catch (e) {
      console.error("TTS failed", e);
      setSpeaking(false);
    }
  };

  const stopTTS = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  };

  const suggestions: Suggestion[] = useMemo(() => {
    const result: Suggestion[] = [];
    const truncate = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

    // ---- Device relevance scoring (Frequency 50% + Time 30% + Health 20%) ----
    const devices = elder.devices.filter((d) => !!d.name && !!d.photo && Array.isArray(d.questions) && d.questions.length > 0);
    if (devices.length > 0) {
      const maxAccess = Math.max(1, ...devices.map((d) => d.accessCount ?? 0));
      const period = currentTimePeriod(new Date(nowTick));
      const timeCats = timeCategoryDevices(period);
      const conditions = (elder.conditions || []).map((c) => c.toLowerCase());
      const hasLowVision = conditions.some((c) => c.includes("vision") || c.includes("blind"));
      const hasHearing = conditions.some((c) => c.includes("hear"));
      const hasCognitive = conditions.some((c) => c.includes("cogni") || c.includes("dementia") || c.includes("memory"));

      const healthScore = (d: Device) => {
        const n = d.name.toLowerCase();
        let matches = 0; let possible = 0;
        if (hasLowVision) { possible++; if (/remote|phone|tv|button|large/.test(n)) matches++; }
        if (hasHearing) { possible++; if (/tv|hearing|volume|speaker|phone/.test(n)) matches++; }
        if (hasCognitive) { possible++; if (/pill|medic|alarm|simple/.test(n)) matches++; }
        if (possible === 0) return 50;
        const ratio = matches / possible;
        return ratio === 1 ? 100 : ratio > 0 ? 75 : 50;
      };

      const scored = devices.map((d) => {
        const cat = d.category ?? inferDeviceCategory(d.name);
        const freq = ((d.accessCount ?? 0) / maxAccess) * 100;
        const timeBase = timeCats.includes(cat) ? 100 : 50;
        const time = timeCats.includes(cat) ? Math.min(100, freq * 1.3 + 30) : Math.max(0, freq - 20) || timeBase;
        // Simpler & per-spec: time score is just category match
        const timeScore = timeCats.includes(cat) ? 100 : 50;
        const health = healthScore(d);
        const score = freq * 0.5 + timeScore * 0.3 + health * 0.2;
        return { d, score };
      }).sort((a, b) => b.score - a.score);

      const pick = scored.slice(0, 2);
      // If only 1 device, take its top 2 questions
      if (pick.length === 1) {
        for (const q of pick[0].d.questions.slice(0, 2)) {
          result.push({ icon: <HelpCircle size={18} strokeWidth={2} color={theme.text} />, label: truncate(q), device: pick[0].d });
        }
      } else {
        for (const { d } of pick) {
          const q = d.questions[0];
          if (q) result.push({ icon: <HelpCircle size={18} strokeWidth={2} color={theme.text} />, label: truncate(q), device: d });
        }
      }
    }

    // ---- Next upcoming reminder ----
    const now = new Date(nowTick);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const upcoming = reminders
      .flatMap((r) => r.times.map((t) => {
        const [h, m] = t.split(":").map(Number);
        return { r, t, mins: (h || 0) * 60 + (m || 0) };
      }))
      .filter((x) => x.mins > nowMin)
      .sort((a, b) => a.mins - b.mins)[0];
    if (upcoming) {
      const diff = upcoming.mins - nowMin;
      let time: string;
      if (diff < 1) time = "now";
      else if (diff < 60) time = `${diff} minute${diff === 1 ? "" : "s"}`;
      else {
        const h = Math.floor(diff / 60); const m = diff % 60;
        time = m === 0 ? `${h} hour${h === 1 ? "" : "s"}` : `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`;
      }
      const [hh, mm] = upcoming.t.split(":").map(Number);
      const d = new Date(); d.setHours(hh || 0, mm || 0, 0, 0);
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      result.push({
        icon: <Clock size={18} strokeWidth={2} color={theme.text} />,
        label: truncate(`${upcoming.r.name} at ${timeStr} in ${time}`, 60),
        reminder: upcoming.r,
        time: upcoming.t,
      });
    }

    return result;
  }, [reminders, elder.devices, elder.conditions, theme.text, nowTick]);

  const matchDevice = (q: string): Device | null => {
    const lower = q.toLowerCase();
    return elder.devices.find((d) => lower.includes(d.name.toLowerCase()) || d.questions.some((qq) => lower.includes(qq.toLowerCase().slice(0, 8)))) ?? null;
  };
  const matchReminder = (q: string): Reminder | null => {
    const lower = q.toLowerCase();
    return reminders.find((r) => lower.includes(r.name.toLowerCase())) ?? null;
  };

  const handleSuggestion = async (s: Suggestion) => {
    const query = s.label;
    if (s.device) { bumpDeviceAccess(s.device.id); await openGuide(query, s.device, null); }
    else if (s.reminder) await openReminderChat(s.reminder, query);
    else await handleQuery(query);
  };

  const openReminderChat = async (reminder: Reminder, initialQuery: string) => {
    setView({ kind: "loading", label: initialQuery });
    const userMsg: ChatMsg = { role: "user", content: initialQuery };
    try {
      const { answer } = await callReminderChat({
        data: {
          reminder: { name: reminder.name, time: reminder.times?.[0], type: reminder.type, dose: reminder.dose, details: reminder.details, notes: reminder.notes },
          conditions: elder.conditions,
          messages: [userMsg],
          stage: "intro",
        },
      });
      const next: ChatMsg = { role: "assistant", content: answer };
      setView({ kind: "reminderChat", reminder, messages: [userMsg, next], sending: false, stage: "followup" });
      void playTTS(answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setView({ kind: "answer", query: initialQuery, text: msg, device: null });
    }
  };

  const sendReminderReply = async (replyText: string) => {
    if (view.kind !== "reminderChat" || !replyText.trim() || view.sending) return;
    stopTTS();
    const userMsg: ChatMsg = { role: "user", content: replyText.trim() };
    const newMsgs = [...view.messages, userMsg];
    setView({ ...view, messages: newMsgs, sending: true });
    try {
      const { answer } = await callReminderChat({
        data: {
          reminder: { name: view.reminder.name, time: view.reminder.times?.[0], type: view.reminder.type, dose: view.reminder.dose, details: view.reminder.details, notes: view.reminder.notes },
          conditions: elder.conditions,
          messages: newMsgs,
          stage: view.stage,
        },
      });
      const next: ChatMsg = { role: "assistant", content: answer };
      setView((v) => v.kind === "reminderChat" ? { ...v, messages: [...newMsgs, next], sending: false, stage: "followup" } : v);
      void playTTS(answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      const next: ChatMsg = { role: "assistant", content: msg };
      setView((v) => v.kind === "reminderChat" ? { ...v, messages: [...newMsgs, next], sending: false } : v);
    }
  };

  const openGuide = async (query: string, device: Device | null, reminder: Reminder | null) => {
    setView({ kind: "loading", label: query });
    try {
      const { steps } = await callSteps({
        data: {
          query,
          device: device ? { name: device.name, photo: device.photo, questions: device.questions } : null,
          reminder: reminder ? { name: reminder.name, time: reminder.times[0], dose: reminder.dose, notes: reminder.notes, type: reminder.type, details: reminder.details } : null,
          conditions: elder.conditions,
          mode: "steps",
        },
      });
      if (!steps.length) throw new Error("No steps returned");
      setView({ kind: "guide", label: query, device, reminder, steps, index: 0 });
      void playTTS(steps[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setView({ kind: "answer", query, text: msg, device: null });
    }
  };

  const handleQuery = async (query: string) => {
    if (!query.trim()) return;
    const device = matchDevice(query);
    const reminder = matchReminder(query);
    if (device) return openGuide(query, device, null);
    if (reminder) return openReminderChat(reminder, query);
    setView({ kind: "loading", label: query });
    try {
      const { answer } = await callAnswer({
        data: {
          query,
          device: null,
          reminder: null,
          conditions: elder.conditions,
          mode: "answer",
        },
      });
      setView({ kind: "answer", query, text: answer, device: null });
      void playTTS(answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setView({ kind: "answer", query, text: msg, device: null });
    }
  };

  const submit = () => {
    if (!text.trim()) return;
    const q = text.trim();
    setText("");
    void handleQuery(q);
  };

  const goBack = () => {
    stopTTS();
    setView({ kind: "default" });
  };

  const circleBg = theme.bg === "#FFFFFF" ? "#1A1A2E" : "#E8E8E8";
  const circleIcon = theme.bg === "#FFFFFF" ? "#FFFFFF" : "#1A1A2E";
  const accent = "#6BA24A";

  const renderGuide = () => {
    if (view.kind !== "guide") return null;
    const step = view.steps[view.index];
    const isLast = view.index === view.steps.length - 1;
    const isFirst = view.index === 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
        <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 60%", background: theme.bg, border: cardBorder, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: 220 }}>
            {view.device?.photo ? (
              <img src={view.device.photo} alt={view.device.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ textAlign: "center", padding: 24 }}>
                <Sparkles size={48} color={theme.muted} />
                <div style={{ marginTop: 12, color: theme.muted, fontFamily: "Verdana, sans-serif", fontSize: 14 }}>
                  {view.reminder ? view.reminder.name : view.label}
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, color: theme.muted }}>
                Step {view.index + 1} of {view.steps.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (speaking) stopTTS();
                  else if (voiceOn) void playTTS(step);
                  setVoiceOn((v) => !v);
                }}
                style={{ background: "transparent", border: buttonBorder, borderRadius: 16, padding: "4px 10px", cursor: "pointer", color: theme.text, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontSize: 12 }}
                aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
              >
                {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                Voice {voiceOn ? "ON" : "OFF"}
              </button>
            </div>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: sizes.body >= 28 ? 18 : 16, color: theme.text, lineHeight: 1.5, flex: 1, overflowY: "auto" }}>
              {step}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={isFirst}
                onClick={() => {
                  stopTTS();
                  const next = view.index - 1;
                  setView({ ...view, index: next });
                  void playTTS(view.steps[next]);
                }}
                style={{ flex: 1, height: 44, borderRadius: 8, border: buttonBorder, background: "transparent", color: theme.text, cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}
              >
                <ChevronLeft size={18} /> Back
              </button>
              {isLast ? (
                <button type="button" onClick={goBack} style={{ flex: 1, height: 44, borderRadius: 8, border: "none", background: accent, color: "#FFFFFF", cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopTTS();
                    const next = view.index + 1;
                    setView({ ...view, index: next });
                    void playTTS(view.steps[next]);
                  }}
                  style={{ flex: 1, height: 44, borderRadius: 8, border: "none", background: accent, color: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}
                >
                  Next <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      <style>{`
        @keyframes ttt-pulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); } 70% { box-shadow: 0 0 0 18px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }
        @keyframes ttt-dots { 0%,20% { opacity: 0.2 } 50% { opacity: 1 } 80%,100% { opacity: 0.2 } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: theme.card, border: cardBorder, borderRadius: 12, padding: 30,
          width: "95%", maxWidth: 820, maxHeight: "92vh", overflowY: "auto",
          color: theme.text, boxSizing: "border-box", lineHeight: 1.5,
        }}
      >
        <button type="button" onClick={onClose} aria-label="Close"
          style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", padding: 4, color: theme.text, zIndex: 2 }}>
          <X size={24} strokeWidth={2} color={theme.text} />
        </button>

        {view.kind === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
            <Loader2 size={48} className="" style={{ animation: "spin 1s linear infinite", color: theme.text }} />
            <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, color: theme.text }}>Preparing instructions…</div>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 13, color: theme.muted }}>"{view.label}"</div>
          </div>
        )}

        {view.kind === "guide" && renderGuide()}

        {view.kind === "answer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0" }}>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 13, color: theme.muted }}>You asked</div>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 16, color: theme.text }}>"{view.query}"</div>
            <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 18, color: theme.text, lineHeight: 1.6, marginTop: 8 }}>
              {view.text}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => { if (speaking) stopTTS(); else void playTTS(view.text); }}
                style={{ height: 44, padding: "0 16px", borderRadius: 8, border: buttonBorder, background: "transparent", color: theme.text, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />} {speaking ? "Stop" : "Read aloud"}
              </button>
              <button type="button" onClick={goBack}
                style={{ height: 44, padding: "0 16px", borderRadius: 8, border: "none", background: accent, color: "#FFFFFF", cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                Done
              </button>
            </div>
          </div>
        )}

        {view.kind === "default" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button type="button" onClick={() => setRecording((r) => !r)} aria-label={recording ? "Stop recording" : "Start recording"}
                style={{ width: 120, height: 120, borderRadius: "50%", background: circleBg, border: `3px solid ${theme.text}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: recording ? "ttt-pulse 1.4s infinite" : undefined, padding: 0 }}>
                <Mic size={60} strokeWidth={2} color={circleIcon} />
              </button>
            </div>
            <div style={{ marginTop: 16, textAlign: "center", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 18, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {recording ? (<><span>Listening</span>{[0, 1, 2].map((i) => (<span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: theme.text, display: "inline-block", animation: `ttt-dots 1.2s ${i * 0.2}s infinite` }} />))}</>) : (<span>Tap to talk</span>)}
            </div>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 20, color: theme.text }}>Ask me anything</div>
              <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted, marginTop: 8 }}>How to use a device, your reminders, or to call someone.</div>
            </div>
            {suggestions.length > 0 ? (
              <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                {suggestions.map((s) => (
                  <button key={s.label} type="button" onClick={() => handleSuggestion(s)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 10, background: theme.card, color: theme.text, border: buttonBorder, borderRadius: 20, padding: "8px 12px", height: 44, fontFamily: "Verdana, sans-serif", fontWeight: highContrast ? 800 : 700, fontSize: 14, cursor: "pointer", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {s.icon}<span>{s.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 30, textAlign: "center" }}>
                <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 14, color: theme.muted }}>No devices or reminders set up yet</div>
                <div style={{ fontFamily: "Verdana, sans-serif", fontSize: 12, color: theme.muted, marginTop: 4 }}>Talk to your caregiver to add them</div>
              </div>
            )}
            <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 12, background: theme.card, border: inputBorder, borderRadius: 20, padding: 16, boxSizing: "border-box" }}>
              <Keyboard size={24} strokeWidth={2} color={theme.text} />
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="Type your request..."
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "Verdana, sans-serif", fontSize: 16, color: theme.text, padding: 8, minWidth: 0 }} />
              <button type="button" onClick={submit} aria-label="Send"
                style={{ width: 44, height: 44, borderRadius: "50%", background: circleBg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Send size={20} strokeWidth={2} color={circleIcon} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
