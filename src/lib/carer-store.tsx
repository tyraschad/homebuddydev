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
  photo?: string;
  questions: string[];
};

export type ElderProfile = {
  id: string;
  name: string;
  dob: string;
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

const defaultReminders: Reminder[] = [
  {
    id: "r1",
    type: "medication",
    name: "Aspirin",
    dose: 1,
    timesPerDay: 1,
    times: ["08:00"],
    repeatSchedule: "Daily",
    notes: "Take with food.",
    elderId: "elder-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "r2",
    type: "appointment",
    name: "Dr. Patel checkup",
    details: "Clinic, Room 3",
    timesPerDay: 1,
    times: ["10:30"],
    repeatSchedule: "Weekly",
    elderId: "elder-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "r3",
    type: "activity",
    name: "Afternoon walk",
    details: "20 minutes in the park",
    timesPerDay: 1,
    times: ["15:00"],
    repeatSchedule: "Weekdays",
    elderId: "elder-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const CarerContext = createContext<Ctx | null>(null);

const ELDER_KEY = "carer.elder";
const REMINDERS_KEY = "carer.reminders";

export function CarerProvider({ children }: { children: ReactNode }) {
  const [elder, setElderState] = useState<ElderProfile>(defaultElder);
  const [reminders, setRemindersState] = useState<Reminder[]>(defaultReminders);

  useEffect(() => {
    try {
      const e = localStorage.getItem(ELDER_KEY);
      if (e) {
        const parsed = JSON.parse(e);
        // Back-compat: ensure devices field exists
        setElderState({ ...defaultElder, ...parsed, devices: parsed.devices ?? [] });
      }
      const r = localStorage.getItem(REMINDERS_KEY);
      if (r) setRemindersState(JSON.parse(r));
    } catch {}
  }, []);

  const setElder = (e: ElderProfile) => {
    setElderState(e);
    try { localStorage.setItem(ELDER_KEY, JSON.stringify(e)); } catch {}
  };
  const setReminders = (list: Reminder[]) => {
    setRemindersState(list);
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(list)); } catch {}
  };
  const addReminder = (r: Reminder) => setReminders([...reminders, r]);
  const updateReminder = (r: Reminder) => setReminders(reminders.map((x) => (x.id === r.id ? r : x)));
  const deleteReminder = (id: string) => setReminders(reminders.filter((x) => x.id !== id));
  const resetAll = () => {
    try {
      localStorage.removeItem(ELDER_KEY);
      localStorage.removeItem(REMINDERS_KEY);
      localStorage.removeItem("homebuddy.onboarding.v2");
      localStorage.removeItem("homebuddy.onboarding.completed.v1");
      localStorage.removeItem("homebuddy.tour.completed.v1");
    } catch {}
    setElderState({ ...defaultElder, conditions: [], contacts: [], notes: "", devices: [], name: "" });
    setRemindersState([]);
  };

  return (
    <CarerContext.Provider value={{ elder, setElder, reminders, setReminders, addReminder, updateReminder, deleteReminder, resetAll }}>
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
