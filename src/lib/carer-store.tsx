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
  repeatSchedule: string;
  photo?: string;
  notes?: string;
  elderId: string;
  createdAt: string;
  updatedAt: string;
};

export type Contact = { id: string; name: string; phone: string };

export type ElderProfile = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  avatar?: string;
  conditions: string[];
  contacts: Contact[];
  notes: string;
  context: string;
};

type Ctx = {
  elder: ElderProfile;
  setElder: (e: ElderProfile) => void;
  reminders: Reminder[];
  addReminder: (r: Reminder) => void;
  updateReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
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
  context: "Lives alone in a ground-floor flat. Carer visits twice a day.",
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
  const [reminders, setReminders] = useState<Reminder[]>(defaultReminders);

  useEffect(() => {
    try {
      const e = localStorage.getItem(ELDER_KEY);
      if (e) setElderState(JSON.parse(e));
      const r = localStorage.getItem(REMINDERS_KEY);
      if (r) setReminders(JSON.parse(r));
    } catch {}
  }, []);

  const setElder = (e: ElderProfile) => {
    setElderState(e);
    try { localStorage.setItem(ELDER_KEY, JSON.stringify(e)); } catch {}
  };
  const persist = (list: Reminder[]) => {
    setReminders(list);
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(list)); } catch {}
  };
  const addReminder = (r: Reminder) => persist([...reminders, r]);
  const updateReminder = (r: Reminder) => persist(reminders.map((x) => (x.id === r.id ? r : x)));
  const deleteReminder = (id: string) => persist(reminders.filter((x) => x.id !== id));

  return (
    <CarerContext.Provider value={{ elder, setElder, reminders, addReminder, updateReminder, deleteReminder }}>
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

export const TYPE_LABEL: Record<ReminderType, string> = {
  medication: "Medication",
  appointment: "Appointment",
  activity: "Activity",
  other: "Other",
};
