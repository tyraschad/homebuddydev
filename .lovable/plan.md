## Goal

1. Calendar (DayView + WeekView) starts scrolled to **6 AM** by default but the full 0–23 grid is still scrollable up to midnight.
2. Remove the seeded "Aspirin / Dr. Patel checkup / Afternoon walk" reminders so the app starts empty. Reminders created by the user (already stored in the shared `CarerProvider` context + localStorage) continue to show up on `/elder`, `/carer`, popups, etc. — no other wiring needed because every screen already reads from `useCarer()`.

---

## 1. Sticky-at-6AM scrollable calendar

**File:** `src/routes/carer.index.tsx`

Today DayView and WeekView render all 24 hour rows directly inside the white calendar `<section>` with no scroll container, so they just push the page down. Change:

**a) Wrap the calendar body in a fixed-height scroll container** (around line 407):

```tsx
<section ref={calendarRef} style={{ ...whiteCard, position: "relative" }}>
  <div
    ref={calendarScrollRef}
    style={{ maxHeight: 600, overflowY: "auto", overflowX: "hidden" }}
  >
    {cursor && view === "day"  && <DayView ... />}
    {cursor && view === "week" && <WeekView ... />}
    {cursor && view === "month"&& <MonthView ... />}   {/* month/list don't need scroll but it's harmless */}
    {cursor && view === "list" && <ListView ... />}
  </div>
</section>
```

**b) Add the ref + an effect that scrolls to 6 AM** when day/week view is shown (near the other refs around line 133):

```tsx
const calendarScrollRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (view !== "day" && view !== "week") return;
  const el = calendarScrollRef.current;
  if (!el) return;
  const HOUR_ROW = 60;                  // matches minHeight: 60 in DayView/WeekView
  const HEADER   = view === "week" ? 60 : 0;  // week view has the weekday header row
  el.scrollTop = HEADER + HOUR_ROW * 6; // 6 AM
}, [view, cursor]);
```

This keeps the 0–5 AM rows in place (user can scroll up to reach them) but the calendar opens with 6 AM at the top — same behaviour as Google/Apple Calendar.

---

## 2. Remove hardcoded reminders + keep cross-screen sharing

**File:** `src/lib/carer-store.tsx`

Every screen (`elder.tsx`, `carer.index.tsx`, popups) already pulls reminders from the shared `CarerProvider` via `useCarer()` — no per-screen state. The only reason fake reminders appear is the `defaultReminders` array (lines 163–201) seeded into state and persisted to localStorage on first load.

**a) Empty the seed** (lines 163–201):

```tsx
const defaultReminders: Reminder[] = [];
```

**b) Bump the localStorage key** so existing users who already cached the old seed get a clean slate (line 206):

```tsx
const REMINDERS_KEY = "carer.reminders.v2";
```

Also add the old key to `resetAll`'s cleanup (line 244) so "Reset setup" wipes any legacy entry:

```tsx
localStorage.removeItem("carer.reminders");      // legacy
localStorage.removeItem(REMINDERS_KEY);
```

After this:
- Fresh load → empty reminders list everywhere.
- Carer creates a reminder → `addReminder()` writes to context + `carer.reminders.v2`. The Elder screen, DayView, WeekView, MonthView, ListView, DatePopup, and ViewReminderModal all re-render from the same source. Already verified — no extra wiring needed.

---

## Out of scope

- No change to the 24-hour grid itself (done last turn).
- No design changes to the calendar card; only adds an inner scroll container.
- Empty-state copy already exists ("No reminders scheduled today" on elder, "No reminders yet. Add one to get started." in ListView).
