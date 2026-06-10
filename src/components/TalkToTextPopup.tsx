import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, Send, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, Clock, HelpCircle, Check } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, currentTimePeriod, timeCategoryDevices, inferDeviceCategory, type Device, type Reminder } from "@/lib/carer-store";
import { useServerFn } from "@tanstack/react-start";
import { generateSteps, answerQuestion, speak, reminderChat } from "@/lib/talk.functions";
import { useVoiceRecorder, type VoiceStatus } from "@/lib/use-voice-recorder";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean; // when true, render with blinking cursor
};

type Guide = {
  label: string;
  device: Device | null;
  reminder: Reminder | null;
  steps: string[];
  index: number;
};

type Suggestion = {
  icon: React.ReactNode;
  label: string;
  photo?: string;
  device?: Device | null;
  reminder?: Reminder | null;
};

const ACCENT = "#6BA24A";
const ACCENT_DARK = "#588936";

function InlineMicButton({ status, error, onStart, onStop, onReset, disabled }: {
  status: VoiceStatus; error: string | null;
  onStart: () => void; onStop: () => void; onReset: () => void;
  disabled?: boolean;
}) {
  const isRec = status === "recording";
  const isBusy = status === "transcribing";
  const [hovered, setHovered] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    if (isRec) onStop();
    else if (status === "error") { onReset(); onStart(); }
    else if (!isBusy) onStart();
  };
  const label = error || (isRec ? "Tap to stop" : isBusy ? "Transcribing…" : "Click to talk");
  const labelColor = isRec ? "#DC2626" : "#888888";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <button type="button" onClick={handleClick} disabled={disabled || isBusy} aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: hovered && !disabled && !isBusy && !isRec ? ACCENT_DARK : ACCENT,
          border: isRec ? `2px solid ${ACCENT}` : "none",
          cursor: disabled || isBusy ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          opacity: disabled ? 0.4 : 1,
          animation: isRec ? "ttt-pulse 0.8s infinite" : undefined,
          transition: "background 0.2s, box-shadow 0.2s",
          boxShadow: hovered && !disabled && !isBusy && !isRec ? `0 2px 8px ${ACCENT}40` : "none",
        }}>
        {isBusy
          ? <Loader2 size={24} color="#FFFFFF" style={{ animation: "spin 1s linear infinite" }} />
          : isRec
            ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFFFFF", animation: "ttt-rec-dot 1s infinite" }} />
            : <Mic size={24} color="#FFFFFF" />}
      </button>
      <span style={{
        position: "absolute",
        top: 52,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 12,
        color: labelColor,
        fontFamily: "'Trebuchet MS', sans-serif",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </div>
  );
}

export function TalkToTextPopup({ onClose }: { onClose: () => void }) {
  const { theme, cardBorder, inputBorder, sizes } = useSettings();
  const { reminders, elder, bumpDeviceAccess } = useCarer();
  const callSteps = useServerFn(generateSteps);
  const callAnswer = useServerFn(answerQuestion);
  const callSpeak = useServerFn(speak);
  const callReminderChat = useServerFn(reminderChat);

  const isDark = theme.bg !== "#FFFFFF";
  const aiBubbleBg = isDark ? "#4A4A5E" : "#F0F0F0";
  const aiBubbleText = isDark ? "#E8E8E8" : "#1A1A2E";

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  
  const [guide, setGuide] = useState<Guide | null>(null);
  const [wellDone, setWellDone] = useState<string | null>(null);
  const [reminderCtx, setReminderCtx] = useState<{ reminder: Reminder; stage: "intro" | "followup" } | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, guide, sending]);

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

  // Stream a string into the last assistant message word-by-word
  const streamAssistant = (full: string) => {
    const words = full.split(/(\s+)/); // keep whitespace
    let i = 0;
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);
    const tick = () => {
      i += 2; // word + following whitespace
      const partial = words.slice(0, i).join("");
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") next[next.length - 1] = { ...last, content: partial, streaming: i < words.length };
        return next;
      });
      if (i < words.length) setTimeout(tick, 35);
    };
    setTimeout(tick, 35);
  };

  const suggestions: Suggestion[] = useMemo(() => {
    const result: Suggestion[] = [];
    const truncate = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
    const devices = elder.devices.filter((d) => !!d.name && Array.isArray(d.questions) && d.questions.length > 0);
    if (devices.length > 0) {
      const maxAccess = Math.max(1, ...devices.map((d) => d.accessCount ?? 0));
      const period = currentTimePeriod(new Date(nowTick));
      const timeCats = timeCategoryDevices(period);
      const scored = devices.map((d) => {
        const cat = d.category ?? inferDeviceCategory(d.name);
        const freq = ((d.accessCount ?? 0) / maxAccess) * 100;
        const timeScore = timeCats.includes(cat) ? 100 : 50;
        return { d, score: freq * 0.5 + timeScore * 0.3 + 50 * 0.2 };
      }).sort((a, b) => b.score - a.score);
      const pick = scored.slice(0, 3);
      if (pick.length === 1) {
        for (const q of pick[0].d.questions.slice(0, 2))
          result.push({ icon: <HelpCircle size={20} color={theme.text} />, label: truncate(q), photo: pick[0].d.photo, device: pick[0].d });
      } else {
        for (const { d } of pick) {
          const q = d.questions[0];
          if (q) result.push({ icon: <HelpCircle size={20} color={theme.text} />, label: truncate(q), photo: d.photo, device: d });
        }
      }
    }
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
      const [hh, mm] = upcoming.t.split(":").map(Number);
      const d = new Date(); d.setHours(hh || 0, mm || 0, 0, 0);
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      result.push({ icon: <Clock size={20} color={theme.text} />, label: truncate(`${upcoming.r.name} at ${timeStr}`, 50), reminder: upcoming.r });
    }
    return result;
  }, [reminders, elder.devices, theme.text, nowTick]);

  const matchDevice = (q: string): Device | null => {
    const lower = q.toLowerCase();
    return elder.devices.find((d) => lower.includes(d.name.toLowerCase()) || d.questions.some((qq) => lower.includes(qq.toLowerCase().slice(0, 8)))) ?? null;
  };
  const matchReminder = (q: string): Reminder | null => {
    const lower = q.toLowerCase();
    return reminders.find((r) => lower.includes(r.name.toLowerCase())) ?? null;
  };

  const pushUser = (content: string) => setMessages((m) => [...m, { role: "user", content }]);

  const startGuide = async (query: string, device: Device | null, reminder: Reminder | null) => {
    setWellDone(null);
    setSending(true);
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
      const intro = `Here's how — I'll walk you through ${steps.length} step${steps.length === 1 ? "" : "s"}.`;
      streamAssistant(intro);
      setGuide({ label: query, device, reminder, steps, index: 0 });
      void playTTS(steps[0]);
    } catch (e) {
      streamAssistant(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const startReminderChat = async (reminder: Reminder) => {
    setSending(true);
    setReminderCtx({ reminder, stage: "intro" });
    try {
      const userMsg = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? reminder.name;
      const { answer } = await callReminderChat({
        data: {
          reminder: { name: reminder.name, time: reminder.times?.[0], type: reminder.type, dose: reminder.dose, details: reminder.details, notes: reminder.notes },
          conditions: elder.conditions,
          messages: [{ role: "user", content: userMsg }],
          stage: "intro",
        },
      });
      streamAssistant(answer);
      setReminderCtx({ reminder, stage: "followup" });
      void playTTS(answer);
    } catch (e) {
      streamAssistant(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleQuery = async (raw: string) => {
    const query = raw.trim();
    if (!query || sending) return;
    pushUser(query);

    // Continue an active reminder conversation
    if (reminderCtx) {
      setSending(true);
      try {
        const convo: { role: "user" | "assistant"; content: string }[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: query },
        ];
        const { answer } = await callReminderChat({
          data: {
            reminder: { name: reminderCtx.reminder.name, time: reminderCtx.reminder.times?.[0], type: reminderCtx.reminder.type, dose: reminderCtx.reminder.dose, details: reminderCtx.reminder.details, notes: reminderCtx.reminder.notes },
            conditions: elder.conditions,
            messages: convo,
            stage: reminderCtx.stage,
          },
        });
        streamAssistant(answer);
        setReminderCtx({ ...reminderCtx, stage: "followup" });
        void playTTS(answer);
      } catch (e) {
        streamAssistant(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSending(false);
      }
      return;
    }

    const device = matchDevice(query);
    const reminder = matchReminder(query);
    if (device) { bumpDeviceAccess(device.id); return startGuide(query, device, null); }
    if (reminder) return startReminderChat(reminder);

    setSending(true);
    try {
      const { answer } = await callAnswer({
        data: { query, device: null, reminder: null, conditions: elder.conditions, mode: "answer" },
      });
      streamAssistant(answer);
      void playTTS(answer);
    } catch (e) {
      streamAssistant(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleSuggestion = async (s: Suggestion) => {
    pushUser(s.label);
    if (s.device) { bumpDeviceAccess(s.device.id); await startGuide(s.label, s.device, null); }
    else if (s.reminder) await startReminderChat(s.reminder);
    else await handleQuery(s.label);
  };

  const submit = () => {
    const q = text.trim();
    if (!q) return;
    setText("");
    void handleQuery(q);
  };

  // Voice recorder writes transcript into the input field
  const recorder = useVoiceRecorder((t) => {
    setText(t);
    inputRef.current?.focus();
  });


  const advanceGuide = (delta: 1 | -1) => {
    if (!guide) return;
    stopTTS();
    const next = guide.index + delta;
    if (next < 0 || next >= guide.steps.length) return;
    setGuide({ ...guide, index: next });
    void playTTS(guide.steps[next]);
  };

  const finishGuide = () => {
    stopTTS();
    const label = guide?.label ?? "";
    setGuide(null);
    setWellDone(label);
  };

  // (suggestions are always shown above input when available)
  const bodyFontSize = sizes.body >= 28 ? 18 : 16;
  const sendDisabled = sending || !text.trim();

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 2000, boxSizing: "border-box" }}>
      <style>{`
        @keyframes ttt-pulse { 0% { box-shadow: 0 0 0 0 rgba(107,162,74,0.5); } 70% { box-shadow: 0 0 0 14px rgba(107,162,74,0); } 100% { box-shadow: 0 0 0 0 rgba(107,162,74,0); } }
        @keyframes ttt-big-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 18px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
        @keyframes ttt-rec-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes ttt-cursor { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        .suggestion-chip { transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; }
        .suggestion-chip:hover { border: 2px solid #D0D0D0 !important; background: #F9F9F9 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }
      `}</style>

      <div onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: theme.card, border: cardBorder, borderRadius: 12,
          width: "95%", maxWidth: 820, height: "92vh", maxHeight: 800,
          color: theme.text, boxSizing: "border-box",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: cardBorder, background: isDark ? theme.card : "#F9F9F9", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 16, color: theme.text }}>Chat</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => { if (speaking) stopTTS(); setVoiceOn((v) => !v); }}
              title={voiceOn ? "Voice on" : "Voice off"}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 6, display: "flex", alignItems: "center" }}>
              {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: theme.text, padding: 4, display: "flex", alignItems: "center" }}>
              <X size={28} strokeWidth={2} color={theme.text} />
            </button>
          </div>
        </div>

        {/* Body — scrollable: greeting + chat history / instructions / well done */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {!messages.some((m) => m.role === "user") && !guide && !wellDone && (
            <div style={{ position: "relative", background: "#FFFFFF", border: "2px solid #000000", borderRadius: 12, padding: 20, marginLeft: 14, alignSelf: "flex-start", maxWidth: "90%" }}>
              <span style={{ position: "absolute", left: -14, top: 22, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: "14px solid #000000" }} />
              <span style={{ position: "absolute", left: -11, top: 24, width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "12px solid #FFFFFF" }} />
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 28, color: "#000000", lineHeight: 1.2 }}>
                Hi {elder.name || "there"}, how can I help you today?
              </div>
            </div>
          )}

          {guide && (
            <div style={{ background: "#FFFFFF", border: "2px solid #000000", borderRadius: 8, padding: 20, color: "#000000" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                <div style={{ width: "40%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {guide.device?.photo ? (
                    <img src={guide.device.photo} alt={guide.device.name}
                      style={{ width: "100%", height: 180, objectFit: "cover", border: "1px solid #D0D0D0", borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: "100%", height: 180, border: "1px solid #D0D0D0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
                      No image
                    </div>
                  )}
                </div>
                <div style={{ width: "60%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, color: "#6B6860", fontWeight: 700, marginBottom: 6 }}>
                      Step {guide.index + 1} of {guide.steps.length}
                    </div>
                    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 18, color: "#000000", lineHeight: 1.4 }}>
                      {guide.steps[guide.index]}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <button type="button" onClick={() => advanceGuide(-1)} disabled={guide.index === 0}
                      style={{ height: 44, padding: "0 20px", borderRadius: 8, border: "none",
                        background: "#E5E5E5", color: "#000000", cursor: guide.index === 0 ? "not-allowed" : "pointer",
                        opacity: guide.index === 0 ? 0.5 : 1,
                        fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                        display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ChevronLeft size={18} /> Back
                    </button>
                    {guide.index < guide.steps.length - 1 ? (
                      <button type="button" onClick={() => advanceGuide(1)}
                        style={{ height: 44, padding: "0 20px", borderRadius: 8, border: "none",
                          background: ACCENT, color: "#FFFFFF", cursor: "pointer",
                          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                          display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Next <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button type="button" onClick={finishGuide}
                        style={{ height: 44, padding: "0 24px", borderRadius: 8, border: "none",
                          background: ACCENT, color: "#FFFFFF", cursor: "pointer",
                          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16 }}>
                        Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {wellDone && !guide && (
            <div style={{ background: "#FFFFFF", border: "2px solid #000000", borderRadius: 8, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={40} color="#FFFFFF" strokeWidth={3} />
              </div>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 28, color: "#000000" }}>Well Done!</div>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 18, color: "#6B6860" }}>
                You completed {wellDone}
              </div>
              <button type="button" onClick={() => setWellDone(null)}
                style={{ marginTop: 8, height: 44, padding: "0 20px", borderRadius: 8, border: "2px solid #000000",
                  background: "#FFFFFF", color: "#000000", cursor: "pointer",
                  fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16 }}>
                Back to Chat
              </button>
            </div>
          )}

          {!guide && !wellDone && messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%",
                background: m.role === "user" ? ACCENT : "#F0F0F0",
                color: m.role === "user" ? "#FFFFFF" : "#000000",
                borderRadius: 12, padding: "10px 14px",
                fontFamily: "Inter, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.content}
                {m.streaming && (
                  <span style={{ display: "inline-block", width: 2, height: "1em", background: m.role === "user" ? "#FFFFFF" : "#000000", marginLeft: 2, verticalAlign: "text-bottom", animation: "ttt-cursor 1s infinite" }} />
                )}
              </div>
            </div>
          ))}
          {sending && !guide && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Thinking…
            </div>
          )}
        </div>

        {/* Sticky bottom: mic box + transcript/input box, then quick actions */}
        <div style={{ flexShrink: 0, padding: 16, borderTop: cardBorder, background: theme.card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, height: 220 }}>
            <button type="button"
              onClick={() => { if (recorder.status === "recording") recorder.stop(); else if (recorder.status === "error") { recorder.reset(); void recorder.start(); } else if (recorder.status !== "transcribing") void recorder.start(); }}
              disabled={sending || recorder.status === "transcribing"}
              style={{
                width: "35%", height: "100%", background: "#000000", borderRadius: 8, padding: 20,
                border: "none", cursor: sending ? "not-allowed" : "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
              <div style={{
                width: 150, height: 150, borderRadius: "50%", background: "#FFFFFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: recorder.status === "recording" ? "2px solid #FFFFFF" : "2px solid transparent",
                animation: recorder.status === "recording" ? "ttt-big-pulse 0.8s infinite" : undefined,
              }}>
                {recorder.status === "transcribing"
                  ? <Loader2 size={64} color="#000000" style={{ animation: "spin 1s linear infinite" }} />
                  : <Mic size={80} color="#000000" strokeWidth={2} />}
              </div>
              <div style={{
                fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                color: recorder.status === "recording" ? "#FF3B30" : "#FFFFFF",
                textAlign: "center",
              }}>
                {recorder.status === "recording" ? "Tap to finish talking"
                  : recorder.status === "transcribing" ? "Transcribing…"
                  : "Tap to Talk"}
              </div>
            </button>

            <div style={{
              width: "65%", height: "100%", position: "relative",
              background: "#FFFFFF", border: "2px solid #000000", borderRadius: 8,
            }}>
              <textarea
                value={recorder.status === "recording" ? "" : text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder={recorder.status === "recording" ? "Listening…" : "As you speak, text will show here"}
                disabled={sending || recorder.status === "transcribing" || recorder.status === "recording"}
                style={{
                  width: "100%", height: "100%", boxSizing: "border-box",
                  padding: "16px 72px 16px 16px", border: "none", outline: "none", resize: "none",
                  background: "transparent",
                  fontFamily: "Inter, system-ui, sans-serif", fontSize: 16, color: "#000000",
                }} />
              <button type="button" onClick={submit} disabled={sendDisabled} aria-label="Send"
                style={{
                  position: "absolute", right: 8, bottom: 8,
                  width: 48, height: 48, borderRadius: "50%",
                  background: sendDisabled ? "#B5D4A3" : ACCENT,
                  border: "none", cursor: sendDisabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: sendDisabled ? 0.6 : 1, transition: "background 0.2s",
                }}>
                <Send size={24} color="#FFFFFF" />
              </button>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {suggestions.slice(0, 3).map((s) => (
                <button key={s.label} type="button" onClick={() => handleSuggestion(s)} disabled={sending}
                  style={{
                    flex: 1, height: 60, display: "inline-flex", alignItems: "center", gap: 10,
                    background: "#F0F0F0", color: "#000000", border: "1px solid #D0D0D0",
                    borderRadius: 8, padding: "0 16px",
                    fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                    cursor: sending ? "not-allowed" : "pointer",
                    opacity: sending ? 0.5 : 1, textAlign: "left", overflow: "hidden",
                  }}>
                  {s.photo
                    ? <img src={s.photo} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <span style={{ display: "inline-flex", flexShrink: 0 }}>{s.icon}</span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
