import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ReminderType = "medication" | "appointment" | "activity" | "other";

export type Reminder = {
  id: string;
  type: ReminderType;
  name: string;
  details?: string;
  dose?: number;
  timesPerDay: number;
  times: string[];
  repeats?: boolean;
  repeatSchedule: string;
  weekday?: number;
  monthlyDates?: number[];
  customDays?: number[];
  oneTimeDate?: string;
  photo?: string;
  notes?: string;
  elderId: string;
  // Minutes before the reminder to announce; 0 = at exact time. Default [60,30,5,0].
  announcementOffsets?: number[];
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_ANNOUNCEMENT_OFFSETS = [60, 30, 5, 0];



export type Contact = { id: string; name: string; phone: string };

export type Device = {
  id: string;
  name: string;
  brand?: string;
  type?: string;
  photo?: string;
  questions: string[];
  accessCount?: number;
  category?: DeviceCategory;
};

export type DeviceCategory = "kitchen" | "health" | "bathroom" | "entertainment" | "household" | "communication" | "bedroom" | "emergency" | "other";

const QUICK_ACTION_REWRITES: Record<string, string> = {
  "change the channel": "Change channel",
  "change channel": "Change channel",
  "turn on the tv": "Turn on TV",
  "turn the tv on": "Turn on TV",
  "turn on tv": "Turn on TV",
  "adjust the thermostat": "Adjust thermostat",
  "find netflix shows": "Find Netflix",
  "find netflix": "Find Netflix",
  "search netflix": "Search Netflix",
  "prepare for doctor": "Prepare for appointment",
  "prepare for appointment": "Prepare for appointment",
  "take my medication": "Take medication",
  "take medication": "Take medication",
  "pack for my trip": "Pack for trip",
  "pack for trip": "Pack for trip",
  "turn up the volume": "Turn up volume",
  "turn up volume": "Turn up volume",
};

export function cleanQuickActionLabel(label: string): string {
  const withoutPrefix = label
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^how\s+(?:do\s+i|to|can\s+i|should\s+i)\s+/i, "")
    .replace(/\?+$/g, "")
    .trim();
  const rewrite = QUICK_ACTION_REWRITES[withoutPrefix.toLowerCase()];
  if (rewrite) return rewrite;
  const capitalized = withoutPrefix ? withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1) : "Get help";
  if (capitalized.length <= 25) return capitalized;
  const compact = capitalized
    .replace(/\b(the|a|an|my|your|please|for|to|with|of)\b\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (compact.length <= 25) return compact;
  return compact.split(" ").slice(0, 3).join(" ") || "Get help";
}

function cleanDevices(devices: Device[] = []): Device[] {
  return devices.map((device) => ({
    ...device,
    questions: (device.questions ?? []).map(cleanQuickActionLabel).filter(Boolean),
  }));
}

export function inferDeviceCategory(name: string): DeviceCategory {
  const n = name.toLowerCase();
  if (/microwave|oven|stove|coffee|kettle|blender|fridge|toaster|kitchen/.test(n)) return "kitchen";
  if (/pill|medic|hearing aid|glucose|blood pressure|thermometer|inhaler/.test(n)) return "health";
  if (/shower|sink|mirror|bathroom|toilet|tap|faucet/.test(n)) return "bathroom";
  if (/tv|television|remote|tablet|stream|radio|speaker|music/.test(n)) return "entertainment";
  if (/vacuum|washing|dryer|iron|thermostat|heater/.test(n)) return "household";
  if (/phone|doorbell|intercom|alert|button/.test(n)) return "communication";
  if (/lamp|light|alarm clock|fan|bed/.test(n)) return "bedroom";
  if (/emergency|panic|sos/.test(n)) return "emergency";
  return "other";
}

const TIME_CATEGORIES: Record<"morning" | "afternoon" | "evening" | "night", DeviceCategory[]> = {
  morning: ["kitchen", "health", "bathroom"],
  afternoon: ["entertainment", "household", "communication"],
  evening: ["entertainment", "bedroom", "kitchen"],
  night: ["bedroom", "bathroom", "emergency", "communication"],
};

export function currentTimePeriod(d = new Date()): "morning" | "afternoon" | "evening" | "night" {
  const h = d.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

export function timeCategoryDevices(period: ReturnType<typeof currentTimePeriod>) {
  return TIME_CATEGORIES[period];
}

export type ElderProfile = {
  id: string;
  name: string;
  dob: string;
  age?: number;
  avatar?: string;
  conditions: string[];
  contacts: Contact[];
  notes: string;
  context: string;
  devices: Device[];
};

type Ctx = {
  elder: ElderProfile;
  setElder: (e: ElderProfile) => void;
  reminders: Reminder[];
  setReminders: (rs: Reminder[]) => void;
  addReminder: (r: Reminder) => void;
  updateReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
  bumpDeviceAccess: (deviceId: string) => void;
  resetAll: () => void;
};

const defaultElder: ElderProfile = {
  id: "elder-1",
  name: "Albert",
  dob: "1942-04-12",
  conditions: ["Hypertension", "Type 2 Diabetes"],
  contacts: [
    { id: "c1", name: "Sarah (Daughter)", phone: "+44 7700 900123" },
    { id: "c2", name: "Dr. Patel", phone: "+44 20 7946 0011" },
  ],
  notes: "Prefers tea in the morning. Hard of hearing on the left side.",
  context: "",
  devices: [],
};

const defaultReminders: Reminder[] = [];

const CarerContext = createContext<Ctx | null>(null);

const ELDER_KEY = "carer.elder";
const REMINDERS_KEY = "carer.reminders.v2";

export function CarerProvider({ children }: { children: ReactNode }) {
  const [elder, setElderState] = useState<ElderProfile>(defaultElder);
  const [reminders, setRemindersState] = useState<Reminder[]>(defaultReminders);

  useEffect(() => {
    try {
      const e = localStorage.getItem(ELDER_KEY);
      if (e) {
        const parsed = JSON.parse(e);
        // Back-compat: ensure devices field exists and old question-style shortcuts are cleaned.
        setElderState({ ...defaultElder, ...parsed, devices: cleanDevices(parsed.devices ?? []) });
      }
      const r = localStorage.getItem(REMINDERS_KEY);
      if (r) setRemindersState(JSON.parse(r));
    } catch {}
  }, []);

  const setElder = (e: ElderProfile) => {
    const cleaned = { ...e, devices: cleanDevices(e.devices ?? []) };
    setElderState(cleaned);
    try { localStorage.setItem(ELDER_KEY, JSON.stringify(cleaned)); } catch {}
  };
  const setReminders = (list: Reminder[]) => {
    setRemindersState(list);
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(list)); } catch {}
  };
  const addReminder = (r: Reminder) => setReminders([...reminders, r]);
  const updateReminder = (r: Reminder) => setReminders(reminders.map((x) => (x.id === r.id ? r : x)));
  const deleteReminder = (id: string) => setReminders(reminders.filter((x) => x.id !== id));
  const bumpDeviceAccess = (deviceId: string) => {
    const devices = elder.devices.map((d) => d.id === deviceId ? { ...d, accessCount: (d.accessCount ?? 0) + 1 } : d);
    setElder({ ...elder, devices });
  };
  const resetAll = () => {
    try {
      localStorage.removeItem(ELDER_KEY);
      localStorage.removeItem("carer.reminders"); // legacy
      localStorage.removeItem(REMINDERS_KEY);
      localStorage.removeItem("homebuddy.onboarding.v2");
      localStorage.removeItem("homebuddy.onboarding.completed.v1");
      localStorage.removeItem("homebuddy.tour.completed.v1");
    } catch {}
    setElderState({ ...defaultElder, conditions: [], contacts: [], notes: "", devices: [], name: "" });
    setRemindersState([]);
  };

  return (
    <CarerContext.Provider value={{ elder, setElder, reminders, setReminders, addReminder, updateReminder, deleteReminder, bumpDeviceAccess, resetAll }}>
      {children}
    </CarerContext.Provider>
  );
}

export function useCarer() {
  const ctx = useContext(CarerContext);
  if (!ctx) throw new Error("useCarer must be used within CarerProvider");
  return ctx;
}

export const TYPE_COLOR: Record<ReminderType, string> = {
  medication: "#3B82F6",
  appointment: "#F59E0B",
  activity: "#22C55E",
  other: "#6B7280",
};

export const TYPE_BG_LIGHT: Record<ReminderType, string> = {
  medication: "#E3F2FD",
  appointment: "#FFF3E0",
  activity: "#E8F5E9",
  other: "#F5F5F5",
};

export const TYPE_BG_DARK: Record<ReminderType, string> = {
  medication: "#1E3A8A",
  appointment: "#7C2D12",
  activity: "#166534",
  other: "#374151",
};

export function reminderBg(type: ReminderType, mode: "light" | "dark") {
  return (mode === "dark" ? TYPE_BG_DARK : TYPE_BG_LIGHT)[type];
}

export const TYPE_LABEL: Record<ReminderType, string> = {
  medication: "Medication",
  appointment: "Appointment",
  activity: "Activity",
  other: "Other",
};
