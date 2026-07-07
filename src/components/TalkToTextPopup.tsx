import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, Send, ArrowUp, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, Clock, HelpCircle, Check } from "lucide-react";
import { useSettings } from "@/lib/settings-store";
import { useCarer, currentTimePeriod, timeCategoryDevices, inferDeviceCategory, cleanQuickActionLabel, type Device, type Reminder } from "@/lib/carer-store";
import { useServerFn } from "@tanstack/react-start";
import { generateSteps, answerQuestion, speak, reminderChat, clarifyOrAnswer, routeDevice } from "@/lib/talk.functions";
import { useVoiceRecorder, type VoiceStatus } from "@/lib/use-voice-recorder";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean; // when true, render with blinking cursor
  createdAt: number;
};

const MESSAGE_TTL_MS = 5 * 60 * 1000;

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
  const labelColor = isRec ? "#DC2626" : "#000000";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <button type="button" onClick={handleClick} disabled={disabled || isBusy} aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "#000000",
          border: isRec ? `2px solid #000000` : "none",
          cursor: disabled || isBusy ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          opacity: disabled ? 0.4 : 1,
          animation: isRec ? "ttt-pulse 0.8s infinite" : undefined,
          transition: "background 0.2s, box-shadow 0.2s",
          boxShadow: hovered && !disabled && !isBusy && !isRec ? `0 2px 8px rgba(0,0,0,0.3)` : "none",
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
        fontFamily: "Inter, system-ui, sans-serif",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </div>
  );
}

function isScheduleQuery(q: string): boolean {
  const lower = q.toLowerCase().trim();
  const schedulePatterns = [
    /what\s+do\s+i\s+have/,
    /what'?s\s+coming\s+up/,
    /what'?s\s+on\s+my\s+(?:schedule|calendar)/,
    /what\s+is\s+planned/,
    /upcoming\s+(?:events?|reminders?)/,
    /my\s+(?:schedule|reminders?|plans?)/,
    /anything\s+(?:planned|scheduled)/,
  ];
  return schedulePatterns.some((p) => p.test(lower));
}

function getDateContext(q: string): "today" | "tomorrow" | "week" | null {
  const lower = q.toLowerCase();
  if (/\btoday\b/.test(lower)) return "today";
  if (/\btomorrow\b/.test(lower)) return "tomorrow";
  if (/\bthis\s+week\b/.test(lower)) return "week";
  return null;
}

function reminderOccursOn(r: Reminder, date: Date): boolean {
  if (r.repeats === false) {
    return r.oneTimeDate === date.toISOString().slice(0, 10);
  }
  const dow = date.getDay();
  switch (r.repeatSchedule) {
    case "Daily": return true;
    case "Weekly": return r.weekday === dow;
    case "Monthly": return (r.monthlyDates ?? []).includes(date.getDate());
    case "Weekdays": return dow >= 1 && dow <= 5;
    case "Custom": return (r.customDays ?? []).includes(dow);
    default: return false;
  }
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function buildScheduleResponse(query: string, reminders: Reminder[]): string {
  const ctx = getDateContext(query);
  const now = new Date();
  const targets: Date[] = [];

  if (ctx === "today") {
    targets.push(now);
  } else if (ctx === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    targets.push(t);
  } else if (ctx === "week") {
    for (let i = 0; i < 7; i++) {
      const t = new Date(now);
      t.setDate(t.getDate() + i);
      targets.push(t);
    }
  } else {
    targets.push(now);
  }

  type Item = { name: string; time: string; minutes: number; date: Date };
  const items: Item[] = [];

  for (const r of reminders) {
    for (const date of targets) {
      if (reminderOccursOn(r, date)) {
        for (const t of r.times) {
          const [h, mm] = t.split(":").map(Number);
          items.push({ name: r.name, time: fmtTime(t), minutes: (h || 0) * 60 + (mm || 0), date });
        }
      }
    }
  }

  if (items.length === 0) {
    return "You don't have anything scheduled. Check your physical calendar if you have other plans.";
  }

  items.sort((a, b) => {
    const dayDiff = a.date.getTime() - b.date.getTime();
    if (dayDiff !== 0) return dayDiff;
    return a.minutes - b.minutes;
  });

  const parts = items.map((i) => {
    const isToday = i.date.toDateString() === now.toDateString();
    const dayName = isToday ? "" : i.date.toLocaleDateString("en-US", { weekday: "long" });
    const timeStr = dayName ? `${dayName} ${i.time}` : i.time;
    return `${i.name} at ${timeStr}`;
  });

  let response: string;
  if (parts.length === 1) {
    response = `You have ${parts[0]}.`;
  } else {
    const last = parts[parts.length - 1];
    const rest = parts.slice(0, -1);
    response = `You have ${rest.join(", ")} and ${last}.`;
  }
  response += " Would you like help with any of these?";
  return response;
}

export function TalkToTextPopup({ onClose, initialMessage, inline = false }: { onClose?: () => void; initialMessage?: string; inline?: boolean }) {
  const { theme, cardBorder, inputBorder, sizes, highContrast } = useSettings();
  const { reminders, elder, bumpDeviceAccess } = useCarer();
  const callSteps = useServerFn(generateSteps);
  const callAnswer = useServerFn(answerQuestion);
  const callSpeak = useServerFn(speak);
  const callReminderChat = useServerFn(reminderChat);
  const callClarify = useServerFn(clarifyOrAnswer);

  const v2 = !highContrast;
  const TEAL = "#1B5E5E";
  const BEIGE = "#F0EDE5";
  const GREEN_DARK = "#4A7C59";
  const isDark = theme.bg !== "#FFFFFF";
  const aiBubbleBg = v2 ? "#F0F0F0" : (isDark ? "#4A4A5E" : "#F0F0F0");
  const aiBubbleText = v2 ? TEAL : (isDark ? "#E8E8E8" : "#1A1A2E");


  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  
  const [guide, setGuide] = useState<Guide | null>(null);
  const [wellDone, setWellDone] = useState<string | null>(null);
  const [reminderCtx, setReminderCtx] = useState<{ reminder: Reminder; stage: "intro" | "followup" } | null>(null);
  const [clarifyCtx, setClarifyCtx] = useState<{
    device: Device;
    query: string;
    history: { role: "user" | "assistant"; content: string }[];
    turnCount: number;
    quickReplies?: string[];
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [showGeneralNote, setShowGeneralNote] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-expire chat messages after 5 minutes (keep streaming ones alive)
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - MESSAGE_TTL_MS;
      setMessages((m) => m.filter((msg) => msg.streaming || msg.createdAt > cutoff));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!onClose) return;
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
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true, createdAt: Date.now() }]);
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
    const formatAction = (s: string) => cleanQuickActionLabel(s);
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
          result.push({ icon: <HelpCircle size={20} color={theme.text} />, label: formatAction(q), photo: pick[0].d.photo, device: pick[0].d });
      } else {
        for (const { d } of pick) {
          const q = d.questions[0];
          if (q) result.push({ icon: <HelpCircle size={20} color={theme.text} />, label: formatAction(q), photo: d.photo, device: d });
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
      result.push({ icon: <Clock size={20} color={theme.text} />, label: formatAction(`${upcoming.r.name} at ${timeStr}`), reminder: upcoming.r });
    }
    return result;
  }, [reminders, elder.devices, theme.text, nowTick]);

  const routeDeviceFn = useServerFn(routeDevice);
  const routeCacheRef = useRef<Map<string, string | null>>(new Map());

  // Keyword groups → tokens that imply this device family
  const DEVICE_KEYWORDS: Record<string, string[]> = {
    tv: ["tv", "remote", "channel", "input", "source", "hdmi", "volume", "mute", "netflix", "youtube", "prime", "cable", "antenna", "subtitle", "guide"],
    phone: ["phone", "call", "dial", "answer", "voicemail", "contact", "hang up", "speaker"],
    microwave: ["microwave", "heat", "warm", "reheat", "timer", "defrost", "popcorn"],
    thermostat: ["thermostat", "temperature", "ac", "warmer", "cooler", "heating", "cooling"],
    stove: ["stove", "oven", "burner", "bake", "broil", "preheat", "cooktop"],
    laundry: ["washer", "dryer", "laundry", "wash", "spin", "dry cycle"],
    light: ["light", "lamp", "brightness", "dim"],
  };

  function familyFor(d: Device): string[] {
    const text = `${d.type ?? ""} ${d.name ?? ""}`.toLowerCase();
    const families: string[] = [];
    for (const [fam, words] of Object.entries(DEVICE_KEYWORDS)) {
      if (words.some((w) => text.includes(w))) families.push(fam);
    }
    return families;
  }

  function keywordScore(query: string, d: Device): number {
    const lower = query.toLowerCase();
    let score = 0;
    if (d.name && lower.includes(d.name.toLowerCase())) score += 10;
    if (d.type && lower.includes(d.type.toLowerCase())) score += 6;
    if (d.brand && lower.includes(d.brand.toLowerCase())) score += 4;
    for (const fam of familyFor(d)) {
      for (const w of DEVICE_KEYWORDS[fam]) {
        if (lower.includes(w)) score += 2;
      }
    }
    if (d.questions.some((qq) => lower.includes(qq.toLowerCase().slice(0, 8)))) score += 5;
    return score;
  }

  const matchDevice = async (q: string): Promise<Device | null> => {
    const devices = elder.devices;
    if (!devices.length) return null;
    const scored = devices.map((d) => ({ d, s: keywordScore(q, d) })).sort((a, b) => b.s - a.s);
    if (scored[0]?.s >= 4) return scored[0].d;

    // AI fallback (cached per query)
    const cacheKey = q.trim().toLowerCase();
    const cached = routeCacheRef.current.get(cacheKey);
    if (cached !== undefined) return devices.find((d) => d.id === cached) ?? null;
    try {
      const { deviceId } = await routeDeviceFn({
        data: {
          query: q,
          devices: devices.map((d) => ({ id: d.id, name: d.name, brand: d.brand, type: d.type })),
        },
      });
      routeCacheRef.current.set(cacheKey, deviceId);
      return deviceId ? devices.find((d) => d.id === deviceId) ?? null : null;
    } catch {
      return null;
    }
  };
  const matchReminder = (q: string): Reminder | null => {
    const lower = q.toLowerCase();
    return reminders.find((r) => lower.includes(r.name.toLowerCase())) ?? null;
  };

  const pushUser = (content: string) => {
    setShowGeneralNote(false);
    setMessages((m) => [...m, { role: "user", content, createdAt: Date.now() }]);
  };

  const beginGuideSteps = async (label: string, device: Device | null, reminder: Reminder | null, steps: string[]) => {
    if (!steps.length) throw new Error("No steps returned");
    const intro = `Here's how — I'll walk you through ${steps.length} step${steps.length === 1 ? "" : "s"}.`;
    streamAssistant(intro);
    setGuide({ label, device, reminder, steps, index: 0 });
    void playTTS(steps[0]);
  };

  const runClarifyTurn = async (
    ctx: { device: Device; query: string; history: { role: "user" | "assistant"; content: string }[]; turnCount: number },
  ) => {
    const result = await callClarify({
      data: {
        query: ctx.query,
        device: {
          name: ctx.device.name,
          brand: ctx.device.brand,
          type: ctx.device.type,
          photo: ctx.device.photo,
          questions: ctx.device.questions,
        },
        conditions: elder.conditions,
        clarifyHistory: ctx.history,
        turnCount: ctx.turnCount,
      },
    });
    if (result.kind === "question") {
      streamAssistant(result.question);
      void playTTS(result.question);
      const nextHistory = [...ctx.history, { role: "assistant" as const, content: result.question }];
      setClarifyCtx({
        device: ctx.device,
        query: ctx.query,
        history: nextHistory,
        turnCount: ctx.turnCount + 1,
        quickReplies: result.expectsFreeText ? undefined : result.quickReplies,
      });
    } else {
      setClarifyCtx(null);
      await beginGuideSteps(ctx.query, ctx.device, null, result.steps);
    }
  };

  const startGuide = async (query: string, device: Device | null, reminder: Reminder | null) => {
    setWellDone(null);
    setSending(true);
    try {
      if (device && !reminder) {
        await runClarifyTurn({ device, query, history: [], turnCount: 0 });
      } else {
        const { steps } = await callSteps({
          data: {
            query,
            device: device ? { name: device.name, brand: device.brand, type: device.type, photo: device.photo, questions: device.questions } : null,
            reminder: reminder ? { name: reminder.name, time: reminder.times[0], dose: reminder.dose, notes: reminder.notes, type: reminder.type, details: reminder.details } : null,
            conditions: elder.conditions,
            mode: "steps",
          },
        });
        await beginGuideSteps(query, device, reminder, steps);
      }
    } catch (e) {
      setClarifyCtx(null);
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

    // Schedule / upcoming events query — answer directly from reminders
    if (isScheduleQuery(query)) {
      const response = buildScheduleResponse(query, reminders);
      streamAssistant(response);
      void playTTS(response);
      return;
    }

    // Continue an active clarify session
    if (clarifyCtx) {
      setSending(true);
      try {
        await runClarifyTurn({
          device: clarifyCtx.device,
          query: clarifyCtx.query,
          history: [...clarifyCtx.history, { role: "user", content: query }],
          turnCount: clarifyCtx.turnCount,
        });
      } catch (e) {
        setClarifyCtx(null);
        streamAssistant(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSending(false);
      }
      return;
    }

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

    setSending(true);
    let device: Device | null = null;
    try {
      device = await matchDevice(query);
    } catch { /* fail soft */ }
    const reminder = matchReminder(query);
    if (device) { bumpDeviceAccess(device.id); setSending(false); return startGuide(query, device, null); }
    if (reminder) { setSending(false); return startReminderChat(reminder); }
    setSending(true);
    try {
      const { answer } = await callAnswer({
        data: { query, device: null, reminder: null, conditions: elder.conditions, mode: "answer" },
      });
      streamAssistant(answer);
      setShowGeneralNote(true);
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

  // Voice recorder: inline mode auto-submits (2-tap flow); popup mode fills the input box.
  const recorder = useVoiceRecorder((t) => {
    const trimmed = t.trim();
    if (inline) {
      if (trimmed) void handleQuery(trimmed);
    } else {
      setText(t);
      inputRef.current?.focus();
    }
  });

  // Auto-submit a pre-recorded message (from /elder voice card) exactly once.
  const initialFiredRef = useRef(false);
  useEffect(() => {
    if (initialFiredRef.current) return;
    const seed = initialMessage?.trim();
    if (!seed) return;
    initialFiredRef.current = true;
    void handleQuery(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);




  const advanceGuide = (delta: 1 | -1) => {
    if (!guide) return;
    stopTTS();
    const next = guide.index + delta;
    if (next < 0 || next >= guide.steps.length) return;
    setGuide({ ...guide, index: next });
    void playTTS(guide.steps[next]);
  };

  const playDing = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [
        { f: 1046.5, t: now },
        { f: 1318.5, t: now + 0.12 },
      ].forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      setTimeout(() => ctx.close(), 800);
    } catch {
      // ignore — audio is non-essential
    }
  };

  const finishGuide = () => {
    stopTTS();
    const label = guide?.label ?? "";
    setGuide(null);
    setWellDone(label);
    playDing();
    void playTTS("Well Done! You completed your task");
  };

  // (suggestions are always shown above input when available)
  const bodyFontSize = sizes.body >= 28 ? 18 : 16;
  const sendDisabled = sending || !text.trim();

  return (
    <div
      onClick={inline ? undefined : onClose}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      style={inline
        ? { width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }
        : { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 2000, boxSizing: "border-box" }}>
      <style>{`
        @keyframes ttt-pulse { 0% { box-shadow: 0 0 0 0 rgba(107,162,74,0.5); } 70% { box-shadow: 0 0 0 14px rgba(107,162,74,0); } 100% { box-shadow: 0 0 0 0 rgba(107,162,74,0); } }
       @keyframes ttt-big-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 18px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
       @keyframes ttt-idle-pulse { 0% { box-shadow: 0 0 0 0 rgba(81,157,70,0.55); } 70% { box-shadow: 0 0 0 24px rgba(81,157,70,0); } 100% { box-shadow: 0 0 0 0 rgba(81,157,70,0); } }
        @keyframes ttt-rec-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes ttt-cursor { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes iosConfirmPop { 0% { opacity: 0; transform: scale(0.92); } 45% { opacity: 1; transform: scale(1.035); } 70% { transform: scale(1.012); } 100% { opacity: 1; transform: scale(1); } }
        .ttt-complete-pop { animation: iosConfirmPop 450ms cubic-bezier(0.22, 1, 0.36, 1); transform-origin: center; will-change: transform, opacity; }
        .suggestion-chip { transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; }
        .suggestion-chip:hover { border: 2px solid #D0D0D0 !important; background: #F9F9F9 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }
      `}</style>

      <div onClick={(e) => e.stopPropagation()}
        style={inline
          ? { position: "relative", background: "transparent", border: "none", borderRadius: 0, width: "100%", height: "100%", color: theme.text, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "none" }
          : {
            position: "relative",
            background: v2 ? "#FFFFFF" : "#909090",
            border: v2 ? `2px solid ${GREEN_DARK}` : "2px solid #000000",
            borderRadius: v2 ? 16 : 8,
            width: "95%", maxWidth: 820, height: "92vh", maxHeight: 800,
            color: theme.text, boxSizing: "border-box",
            display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: v2 ? "0 8px 16px rgba(0,0,0,0.2)" : "none",
          }}>


        {/* Header — hidden in inline mode */}
        {!inline && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: v2 ? "1px solid #E5E5E5" : "1px solid #444444",
            background: v2 ? "#FFFFFF" : "#565656",
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16, color: v2 ? TEAL : "#FFFFFF" }}>Chat</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => { if (speaking) stopTTS(); setVoiceOn((v) => !v); }}
                title={voiceOn ? "Voice on" : "Voice off"}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}>
                {voiceOn ? <Volume2 size={20} color={v2 ? TEAL : "#FFFFFF"} /> : <VolumeX size={20} color={v2 ? TEAL : "#FFFFFF"} />}
              </button>
              {onClose && (
                <button type="button" onClick={onClose} aria-label="Close"
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                  <X size={28} strokeWidth={2} color={v2 ? "#000000" : "#FFFFFF"} />
                </button>
              )}
            </div>
          </div>
        )}


        {/* Body — scrollable: greeting + chat history / instructions / well done. In inline mode, collapse when empty so the mic stays centered. */}
        {(() => {
          const hasContent = messages.length > 0 || !!guide || !!wellDone || sending;
          if (inline && !hasContent) return null;
          return (
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: inline ? "0 0 16px 0" : "16px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {!inline && !messages.some((m) => m.role === "user") && !guide && !wellDone && (
            v2 ? (
              <div style={{ position: "relative", background: ACCENT, borderRadius: 16, padding: "12px 16px", marginLeft: 14, alignSelf: "flex-start", maxWidth: "60%" }}>
                <span style={{ position: "absolute", left: -10, top: 16, width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: `12px solid ${ACCENT}` }} />
                <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16, color: "#FFFFFF", lineHeight: 1.3 }}>
                  Hi {elder.name || "there"}, how can I help you today?
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", background: "#FFFFFF", border: "2px solid #000000", borderRadius: 12, padding: 20, marginLeft: 14, alignSelf: "flex-start", maxWidth: "90%" }}>
                <span style={{ position: "absolute", left: -14, top: 22, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: "14px solid #000000" }} />
                <span style={{ position: "absolute", left: -11, top: 24, width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "12px solid #FFFFFF" }} />
                <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 28, color: "#000000", lineHeight: 1.2 }}>
                  Hi {elder.name || "there"}, how can I help you today?
                </div>
              </div>
            )
          )}

          {guide && (
            <div style={{
              background: "#FFFFFF",
              border: v2 ? "1px solid #E5E5E5" : "2px solid #000000",
              borderRadius: v2 ? 12 : 8,
              padding: 20,
              color: v2 ? TEAL : "#000000",
            }}>
              <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                <div style={{ width: "40%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {guide.device?.photo ? (
                    <img src={guide.device.photo} alt={guide.device.name}
                      style={{ width: "100%", height: 180, objectFit: "cover", border: "1px solid #D0D0D0", borderRadius: v2 ? 8 : 4 }} />
                  ) : (
                    <div style={{ width: "100%", height: 180, border: "1px solid #D0D0D0", borderRadius: v2 ? 8 : 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
                      No image
                    </div>
                  )}
                </div>
                <div style={{ width: "60%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, color: v2 ? "#6B8E8E" : "#6B6860", fontWeight: 700, marginBottom: 6 }}>
                      Step {guide.index + 1} of {guide.steps.length}
                    </div>
                    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: v2 ? 16 : 18, color: v2 ? TEAL : "#000000", lineHeight: 1.4 }}>
                      {guide.steps[guide.index]}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => advanceGuide(-1)} disabled={guide.index === 0}
                      aria-label="Back"
                      style={{ height: 44, width: 44, padding: 0, borderRadius: v2 ? 12 : 8, border: "none",
                        background: "#E5E5E5", color: v2 ? TEAL : "#000000", cursor: guide.index === 0 ? "not-allowed" : "pointer",
                        opacity: guide.index === 0 ? 0.5 : 1,
                        fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                        display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronLeft size={18} />
                    </button>
                    {guide.index < guide.steps.length - 1 ? (
                      <button type="button" onClick={() => advanceGuide(1)}
                        style={{ height: 44, padding: "0 20px", borderRadius: v2 ? 12 : 8, border: "none",
                          background: ACCENT, color: "#FFFFFF", cursor: "pointer",
                          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16,
                          display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Next <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button type="button" onClick={finishGuide}
                        style={{ height: 44, padding: "0 24px", borderRadius: v2 ? 12 : 8, border: "none",
                          background: ACCENT, color: "#FFFFFF", cursor: "pointer",
                          fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16 }}>
                        Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {!guide.device?.photo && (
                <div style={{
                  marginTop: 14, padding: "10px 12px",
                  background: v2 ? "#F5F7F5" : "#F0F0F0",
                  border: "1px solid #D0D0D0", borderRadius: 8,
                  fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, lineHeight: 1.5,
                  color: v2 ? "#6B8E8E" : "#4A4A4A",
                }}>
                  The following instructions are based on general information. For specific guidance for your device or appliance, upload an image into the instruction context area of the carer portal.
                </div>
              )}
            </div>
          )}

          {wellDone && !guide && (
            <div className={v2 ? "ttt-complete-pop" : undefined} style={{
              background: "#FFFFFF",
              border: v2 ? "1px solid #E5E5E5" : "2px solid #000000",
              borderRadius: v2 ? 12 : 8,
              padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{ fontSize: 56, lineHeight: 1, color: ACCENT, fontWeight: 900 }}>✓</div>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 28, color: v2 ? TEAL : "#000000" }}>Well Done!</div>
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 18, color: v2 ? "#888888" : "#6B6860" }}>
                You completed {wellDone}
              </div>
              <button type="button" onClick={() => setWellDone(null)}
                style={{ marginTop: 8, height: 44, padding: "0 20px",
                  borderRadius: v2 ? 12 : 8,
                  border: v2 ? "1px solid #E5E5E5" : "2px solid #000000",
                  background: "#FFFFFF", color: v2 ? TEAL : "#000000", cursor: "pointer",
                  fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 16 }}>
                Back to Chat
              </button>
            </div>
          )}

          {!guide && !wellDone && messages.map((m, i) => {
            const LIGHT_GREEN = "#A8D08A";
            const isUser = m.role === "user";
            // V2: user = white text on accent green w/ light green outline; AI = unchanged bg + light green outline
            // V1: user = unchanged (black text on #CBE894 w/ 2px black border); AI = 2px green outline
            const userBg = v2 ? ACCENT : "#CBE894";
            const userColor = v2 ? "#FFFFFF" : "#000000";
            let border: string | undefined;
            if (isUser) {
              border = v2 ? `1px solid ${LIGHT_GREEN}` : "2px solid #000000";
            } else {
              border = v2 ? `1px solid ${LIGHT_GREEN}` : `2px solid ${ACCENT}`;
            }
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  background: isUser ? userBg : aiBubbleBg,
                  color: isUser ? userColor : aiBubbleText,
                  border,
                  borderRadius: 12, padding: "10px 14px",
                  fontFamily: "Inter, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.content}
                  {m.streaming && (
                    <span style={{ display: "inline-block", width: 2, height: "1em", background: isUser ? userColor : aiBubbleText, marginLeft: 2, verticalAlign: "text-bottom", animation: "ttt-cursor 1s infinite" }} />
                  )}
                </div>
              </div>
            );
          })}
          {sending && !guide && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Thinking…
            </div>
          )}
          {showGeneralNote && !guide && !sending && (
            <div style={{
              alignSelf: "stretch", padding: "10px 12px",
              background: v2 ? "#F5F7F5" : "#F0F0F0",
              border: "1px solid #D0D0D0", borderRadius: 8,
              fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, lineHeight: 1.5,
              color: v2 ? "#6B8E8E" : "#4A4A4A",
            }}>
              The following instructions are based on general information. For specific guidance for your device or appliance, upload an image into the instruction context area of the carer portal.
            </div>
          )}
        </div>
          );
        })()}



        {/* Sticky bottom: mic box + transcript/input box, then quick actions */}
        {(() => {
          const hasContent = messages.length > 0 || !!guide || !!wellDone || sending;
          const centerWhenEmpty = inline && !hasContent;
          return (
        <div style={{
          flexShrink: 0, padding: inline ? 0 : 16,
          borderTop: inline ? "none" : (v2 ? "1px solid #E5E5E5" : "1px solid #444444"),
          background: inline ? "transparent" : (v2 ? "#FFFFFF" : "#565656"),
          display: "flex", flexDirection: "column", gap: 12,
          flex: centerWhenEmpty ? 1 : undefined,
          justifyContent: centerWhenEmpty ? "center" : undefined,
        }}>


          {clarifyCtx?.quickReplies && clarifyCtx.quickReplies.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {clarifyCtx.quickReplies.map((chip) => (
                <button key={chip} type="button" disabled={sending}
                  onClick={() => { void handleQuery(chip); }}
                  style={{
                    minHeight: 44, padding: "0 16px",
                    background: v2 ? BEIGE : "#F0F0F0",
                    color: v2 ? TEAL : "#000000",
                    border: v2 ? `1px solid ${ACCENT}` : "1px solid #000000",
                    borderRadius: 999,
                    fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700,
                    fontSize: sizes.body >= 28 ? 17 : 15,
                    cursor: sending ? "not-allowed" : "pointer",
                    opacity: sending ? 0.6 : 1,
                  }}>
                  {chip}
                </button>
              ))}
            </div>
          )}
          {inline ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "8px 0" }}>
              <button type="button"
                onClick={() => { if (recorder.status === "recording") recorder.stop(); else if (recorder.status === "error") { recorder.reset(); void recorder.start(); } else if (recorder.status !== "transcribing" && !sending) void recorder.start(); }}
                disabled={sending || recorder.status === "transcribing"}
                aria-label={recorder.status === "recording" ? "Tap to stop and send" : "Tap to ask a question"}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
                  cursor: sending || recorder.status === "transcribing" ? "not-allowed" : "pointer",
                  width: "100%",
                }}>

                <div style={{
                  width: 150, height: 150, aspectRatio: "1 / 1", flexShrink: 0,
                  borderRadius: "50%",
                  background: recorder.status === "recording" ? "#FF3B30" : (v2 ? "#FFFFFF" : "#FFFFFF"),
                  border: recorder.status === "recording" ? "2px solid #FF3B30" : `2px solid ${v2 ? ACCENT : "#000000"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: recorder.status === "recording" ? "ttt-big-pulse 1.2s infinite" : (v2 && recorder.status === "idle" && !sending ? "ttt-idle-pulse 2s ease-out infinite" : undefined),
                  transition: "background 0.2s, border 0.2s",
                }}>
                  {recorder.status === "transcribing"
                    ? <Loader2 size={75} color={v2 ? TEAL : "#000000"} style={{ animation: "spin 1s linear infinite" }} />
                    : <Mic size={82} color={recorder.status === "recording" ? "#FFFFFF" : (v2 ? TEAL : "#000000")} strokeWidth={2} />}
                </div>
                {(() => {
                  const hasAsked = messages.some((m) => m.role === "user");
                  const label = recorder.status === "recording" ? "Tap to stop and send"
                    : recorder.status === "transcribing" ? "One moment…"
                    : sending ? "Thinking…"
                    : hasAsked ? null
                    : "Tap to Ask a Question";
                  if (!label) return null;
                  return (
                    <div data-readable="true" style={{
                      fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 26,
                      color: recorder.status === "recording" ? "#FF3B30" : (v2 ? TEAL : "#000000"),
                      textAlign: "center",
                    }}>
                      {label}
                    </div>
                  );
                })()}
                {recorder.status === "error" && recorder.error && (
                  <div data-readable="true" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 16, color: "#B00020", textAlign: "center" }}>
                    {recorder.error}
                  </div>
                )}
              </button>
            </div>
          ) : (
          <div style={{ display: "flex", gap: 12, height: 180 }}>
            <button type="button"
              onClick={() => { if (recorder.status === "recording") recorder.stop(); else if (recorder.status === "error") { recorder.reset(); void recorder.start(); } else if (recorder.status !== "transcribing") void recorder.start(); }}
              disabled={sending || recorder.status === "transcribing"}
              style={{
                width: "35%", height: "100%",
                background: "#FFFFFF",
                borderRadius: v2 ? 12 : 8, padding: 16,
                border: v2 ? "1px solid #E5E5E5" : "1px solid transparent",
                cursor: sending ? "not-allowed" : "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <div style={{
                width: 120, height: 120, aspectRatio: "1 / 1", flexShrink: 0,
                borderRadius: "50%", background: v2 ? "#FFFFFF" : "#000000",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: v2
                  ? `4px solid ${ACCENT}`
                  : (recorder.status === "recording" ? "2px solid #000000" : "2px solid #000000"),
                animation: recorder.status === "recording" ? (v2 ? "ttt-pulse 0.8s infinite" : "ttt-big-pulse 0.8s infinite") : undefined,
              }}>
                {recorder.status === "transcribing"
                  ? <Loader2 size={64} color={v2 ? TEAL : "#FFFFFF"} style={{ animation: "spin 1s linear infinite" }} />
                  : <Mic size={v2 ? 60 : 80} color={v2 ? TEAL : "#FFFFFF"} strokeWidth={2} />}
              </div>
              <div style={{
                fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 14,
                color: recorder.status === "recording" ? "#FF3B30" : (v2 ? TEAL : "#000000"),
                textAlign: "center",
              }}>
                {recorder.status === "recording" ? "Tap to finish talking"
                  : recorder.status === "transcribing" ? "Transcribing…"
                  : "Tap to Ask a Question"}
              </div>
            </button>


            <div style={{
              width: "65%", height: "100%", position: "relative",
              background: "#FFFFFF",
              border: v2 ? "1px solid #E5E5E5" : "2px solid #000000",
              borderRadius: v2 ? 12 : 8,
            }}>
              <textarea
                value={recorder.status === "recording" ? "" : text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder={recorder.status === "recording" ? "Listening…" : "As the user speaks, text should appear here."}
                disabled={sending || recorder.status === "transcribing" || recorder.status === "recording"}
                style={{
                  width: "100%", height: "100%", boxSizing: "border-box",
                  padding: "12px 66px 12px 12px", border: "none", outline: "none", resize: "none",
                  background: "transparent",
                  fontFamily: "Inter, system-ui, sans-serif", fontSize: 14,
                  color: v2 ? TEAL : "#000000",
                  fontStyle: text ? "normal" : "italic",
                }} />
              <button type="button" onClick={submit} disabled={sendDisabled} aria-label="Send"
                style={{
                  position: "absolute", right: 8, bottom: 8,
                  width: v2 ? 40 : 48, height: v2 ? 40 : 48,
                  borderRadius: v2 ? 8 : "50%",
                  background: v2 ? "#F0F0F0" : (sendDisabled ? "#B5D4A3" : ACCENT),
                  border: v2 ? "1px solid #E5E5E5" : "none",
                  cursor: sendDisabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: sendDisabled ? 0.6 : 1, transition: "background 0.2s",
                }}>
                {v2
                  ? <ArrowUp size={20} color="#888888" />
                  : <Send size={24} color="#FFFFFF" />}
              </button>

            </div>
          </div>
          )}


          {!inline && suggestions.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {suggestions.slice(0, 3).map((s) => (
                <button key={s.label} type="button" onClick={() => handleSuggestion(s)} disabled={sending}
                  style={{
                    flex: 1, height: 52, display: "inline-flex", alignItems: "center", gap: 10,
                    background: v2 ? BEIGE : "#F0F0F0",
                    color: v2 ? TEAL : "#000000",
                    border: v2 ? "1px solid #E5E5E5" : "1px solid #D0D0D0",
                    borderRadius: v2 ? 12 : 8, padding: "0 16px",
                    fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: sending ? "not-allowed" : "pointer",
                    opacity: sending ? 0.5 : 1, textAlign: "left", overflow: "hidden",
                  }}>
                  {s.photo
                    ? <img src={s.photo} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <span style={{ display: "inline-flex", flexShrink: 0 }}>
                        {/* Re-color icon for v2 */}
                        {v2 ? <span style={{ color: TEAL, display: "inline-flex" }}>{s.icon}</span> : s.icon}
                      </span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                </button>

              ))}
            </div>
          )}
        </div>
          );
        })()}
      </div>
    </div>
  );
}
