## Goal

In `/carer`:
1. Calendar grid covers a full 24 hours (00:00–23:00), not 06:00–22:00.
2. Tapping an empty time slot opens the new-reminder flow with the **Time** field pre-filled to the hour that was clicked.

All edits are in **`src/routes/carer.index.tsx`** (the carer screen + DayView/WeekView live here).

---

## 1. Make the calendar 24-hour

Today the hour list is hard-coded to 17 hours starting at 6am — this is why both DayView and WeekView end at 10pm.

**File:** `src/routes/carer.index.tsx`, line 626

```tsx
// before
function hours() { return Array.from({ length: 17 }, (_, i) => 6 + i); } // 6..22

// after
function hours() { return Array.from({ length: 24 }, (_, i) => i); } // 0..23
```

`formatHour` already handles `0` correctly (returns "12 AM"), so DayView (line 641) and WeekView (line 699) automatically render all 24 rows. No styling changes needed — the grid scrolls vertically as it does now.

---

## 2. Prefill Time when tapping a calendar slot

Currently, tapping an empty slot just opens the category picker with a hard-coded default time of `"08:00"`:

- Line 646 (DayView): `onClick={() => slot.length === 0 && onAdd()}` — no time passed
- Line 408 (carer page): `onAdd={() => setPickCategoryOpen(true)}`
- Line 440 (CategoryPicker.onPick): `times: ["08:00"]` (the hard-coded default)

### Changes

**a) `DayView` passes the clicked hour up** (lines 634–646)

```tsx
function DayView({ date, reminders, onOpen, onAdd, theme, appearance, gridLine }: {
  date: Date; reminders: Reminder[]; onOpen: (r: Reminder) => void;
  onAdd: (time?: string) => void;   // <- accept optional time
  theme: ThemeT; appearance: "light" | "dark"; gridLine: string;
}) {
  ...
  {hours().map((h) => {
    const hh = String(h).padStart(2, "0");
    const slot = ...;
    return (
      <div key={h}
        onClick={() => slot.length === 0 && onAdd(`${hh}:00`)}  // <- pass "HH:00"
        ...
```

**b) Carer page stores the prefill time and passes it into the new reminder** (around lines 120, 408, 434–446)

```tsx
const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
const [prefillTime, setPrefillTime] = useState<string | null>(null);   // NEW
```

```tsx
// line 408
<DayView
  ...
  onAdd={(time) => { setPrefillTime(time ?? null); setPickCategoryOpen(true); }}
/>

// the existing "+ Add reminder" button stays as-is (no prefill):
<button onClick={() => { setPrefillTime(null); setPickCategoryOpen(true); }} ... >
```

```tsx
// lines 434–446 — use prefillTime when creating the draft reminder
{pickCategoryOpen && (
  <CategoryPicker
    onClose={() => { setPickCategoryOpen(false); setPrefillTime(null); }}
    onPick={(type) => {
      const startTime = prefillTime ?? "08:00";
      setPickCategoryOpen(false);
      setPrefillTime(null);
      setEditing({
        id: uid(), type, name: "", timesPerDay: 1,
        times: [startTime],                       // <- prefilled hour
        repeatSchedule: "Daily", elderId: elder.id,
        dose: type === "medication" ? 1 : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }}
  />
)}
```

`ReminderForm` already binds its Time input to `initial.times[0]`, so the popup will open with the clicked hour already filled in. The user can still edit it before saving.

---

## Out of scope

- WeekView empty-cell clicks (cells are tiny chip wells, not a "tap to create" target today). Happy to add this in a follow-up if you want it too.
- No changes to elder screen, settings, or styling.
