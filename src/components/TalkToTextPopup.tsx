import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, Send, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, RotateCcw, Clock, HelpCircle } from "lucide-react";
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

  const welcome = `Hi ${elder.name || "there"}! What would you like to know? Ask about a device, your reminders, or to call someone.`;
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: welcome },
  ]);
  const [text, setText] = useState("");
  
  const [guide, setGuide] = useState<Guide | null>(null);
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
          result.push({ icon: <HelpCircle size={16} color={theme.text} />, label: truncate(q), photo: pick[0].d.photo, device: pick[0].d });
      } else {
        for (const { d } of pick) {
          const q = d.questions[0];
          if (q) result.push({ icon: <HelpCircle size={16} color={theme.text} />, label: truncate(q), photo: d.photo, device: d });
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
      result.push({ icon: <Clock size={16} color={theme.text} />, label: truncate(`${upcoming.r.name} at ${timeStr}`, 50), reminder: upcoming.r });
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
    setGuide(null);
    streamAssistant("Well done! Let me know if you need anything else.");
  };

  // (suggestions are always shown above input when available)
  const bodyFontSize = sizes.body >= 28 ? 18 : 16;
  const sendDisabled = sending || !text.trim();

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 2000, boxSizing: "border-box" }}>
      <style>{`
        @keyframes ttt-pulse { 0% { box-shadow: 0 0 0 0 rgba(107,162,74,0.5); } 70% { box-shadow: 0 0 0 14px rgba(107,162,74,0); } 100% { box-shadow: 0 0 0 0 rgba(107,162,74,0); } }
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

        {/* Chat history */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px 24px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%",
                background: m.role === "user" ? ACCENT : aiBubbleBg,
                color: m.role === "user" ? "#FFFFFF" : aiBubbleText,
                borderRadius: 16, padding: "12px 16px",
                fontFamily: "'Trebuchet MS', sans-serif", fontSize: bodyFontSize, lineHeight: 1.5,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.content}
                {m.streaming && (
                  <span style={{ display: "inline-block", width: 2, height: "1em", background: m.role === "user" ? "#FFFFFF" : aiBubbleText, marginLeft: 2, verticalAlign: "text-bottom", animation: "ttt-cursor 1s infinite" }} />
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.muted, fontFamily: "'Trebuchet MS', sans-serif", fontSize: 13, paddingLeft: 4 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Thinking…
            </div>
          )}

          {/* (Quick actions moved to a persistent strip above the input) */}
        </div>

        {/* Instructions area (conditional) */}
        {guide && (
          <div style={{ flexShrink: 0, padding: "0 16px 12px" }}>
            <div style={{
              background: isDark ? "#1E3A4F" : "#E3F2FD",
              border: `1px solid ${isDark ? "#3A5A7A" : "#BBDEFB"}`,
              borderRadius: 8, padding: 16,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Trebuchet MS', sans-serif", fontSize: 14, color: theme.muted, fontWeight: 700 }}>
                  Step {guide.index + 1} of {guide.steps.length}
                </span>
                <button type="button"
                  onClick={() => { if (speaking) stopTTS(); else if (voiceOn) void playTTS(guide.steps[guide.index]); setVoiceOn((v) => !v); }}
                  style={{ background: "transparent", border: `1px solid ${theme.muted}`, borderRadius: 16, padding: "4px 10px", cursor: "pointer", color: theme.text, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontSize: 12 }}>
                  {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />} Voice {voiceOn ? "ON" : "OFF"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {guide.device?.photo && (
                  <div style={{ flex: "0 0 40%", maxHeight: 180, background: "#FFFFFF", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={guide.device.photo} alt={guide.device.name} style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }} />
                  </div>
                )}
                <div style={{ flex: 1, fontFamily: "'Trebuchet MS', sans-serif", fontSize: bodyFontSize, color: aiBubbleText, lineHeight: 1.5 }}>
                  {guide.steps[guide.index]}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {guide.index > 0 && (
                  <button type="button" onClick={() => advanceGuide(-1)}
                    style={{ flex: 1, height: 44, borderRadius: 8, border: `1.5px solid ${theme.text}`, background: "transparent", color: theme.text, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                    <ChevronLeft size={18} /> Back
                  </button>
                )}
                {guide.index < guide.steps.length - 1 ? (
                  <button type="button" onClick={() => advanceGuide(1)}
                    style={{ flex: 1, height: 44, borderRadius: 8, border: "none", background: ACCENT, color: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={finishGuide}
                    style={{ flex: 1, height: 44, borderRadius: 8, border: "none", background: ACCENT, color: "#FFFFFF", cursor: "pointer", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700 }}>
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {recorder.error && (
          <div style={{ flexShrink: 0, padding: "0 16px 6px", color: "#DC2626", fontSize: 13, textAlign: "center" }}>{recorder.error}</div>
        )}

        {/* Quick actions strip (persistent, above input) */}
        {!guide && suggestions.length > 0 && (
          <div style={{ flexShrink: 0, padding: "10px 16px 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "thin" }}>
            {suggestions.map((s) => (
              <button key={s.label} type="button" onClick={() => handleSuggestion(s)} disabled={sending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: theme.card, color: theme.text, border: cardBorder,
                  borderRadius: 20, padding: s.photo ? "4px 12px 4px 4px" : "8px 12px",
                  fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
                  cursor: sending ? "not-allowed" : "pointer", lineHeight: 1.2,
                  whiteSpace: "nowrap", flexShrink: 0, opacity: sending ? 0.5 : 1,
                  height: 36,
                }}>
                {s.photo
                  ? <img src={s.photo} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ flexShrink: 0, padding: "12px 16px 16px", display: "flex", alignItems: "center", gap: 8, borderTop: cardBorder, background: theme.card }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "#FFFFFF",
            border: `${recorder.status === "recording" ? "2px" : "1px"} solid ${recorder.status === "recording" ? ACCENT : "#D0D0D0"}`,
            borderRadius: 24, padding: "0 8px 0 16px", height: 48,
            boxShadow: recorder.status === "recording" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            <input ref={inputRef} type="text" value={text}
              onChange={(e) => { setText(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder={recorder.status === "recording" ? "Listening…" : "Type your request or click to talk..."}
              disabled={sending || recorder.status === "transcribing"}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "'Trebuchet MS', sans-serif", fontSize: 16, color: "#1A1A2E", padding: 0, minWidth: 0, height: "100%" }} />
            <InlineMicButton status={recorder.status} error={recorder.error}
              onStart={recorder.start} onStop={recorder.stop} onReset={recorder.reset} disabled={sending} />
          </div>
          <button type="button" onClick={submit} disabled={sendDisabled} aria-label="Send"
            onMouseDown={(e) => e.preventDefault()}
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: sendDisabled ? "#B5B5B5" : ACCENT,
              border: "none", cursor: sendDisabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { if (!sendDisabled) (e.currentTarget as HTMLButtonElement).style.background = ACCENT_DARK; }}
            onMouseLeave={(e) => { if (!sendDisabled) (e.currentTarget as HTMLButtonElement).style.background = ACCENT; }}>
            <Send size={24} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}
