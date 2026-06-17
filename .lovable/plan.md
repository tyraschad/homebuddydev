# Plan v2 — Elder & Settings tweaks (revised)

Verified the announcements wiring end-to-end: store → toggle → elder scheduler. Confirmed answers folded in.

---

## 1. Align logo + greeting on one line (V1 & V2)

**File:** `src/routes/elder.tsx`, lines **251–271**

The current `paddingBottom: 10` on the `<img>` skews its visual center above the `<h1>` baseline. Remove it, normalize logo height, set `lineHeight: 1` on the heading.

```tsx
<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
  <img
    src={whiteLogo}
    alt="HomeBuddy"
    style={{ display: "block", height: 32, width: "auto" }}
  />
  <h1
    style={{
      fontFamily: headerFont,
      fontWeight: 400,
      fontSize: v2 ? 24 : 20,
      color: headerTextColor,
      margin: 0,
      lineHeight: 1,
      fontStyle: v2 ? "italic" : "normal",
    }}
  >
    {greet}, {elder.name || "Albert"}
  </h1>
</div>
```

Single JSX block serves V1 and V2.

---

## 2. Show only the next 3 upcoming reminders, soonest highlighted

**File:** `src/routes/elder.tsx`, line **220**

```tsx
const upcomingItems = items.filter((i) => !i.completed).slice(0, 3);
```

Existing render (lines 501–567) already highlights the first via `nextKey` — no other change needed.

---

## 3. Reminders linger 5 min after passing; highlight moves on immediately

**File:** `src/routes/elder.tsx`, lines **187** and **197**

A reminder stays in the upcoming list (styled normally, per your answer) for 5 minutes past its scheduled time but is no longer the "next" — so the highlight box jumps to the following reminder right at the scheduled minute.

```tsx
// inside items useMemo (line 187)
completed: nowMin >= 0 && nowMin >= min + 5,   // 5-min grace before moving to Completed

// nextKey (line 197)
const nextKey =
  items.find((i) => i.minutes > nowMin)?.key ??   // soonest still in the future
  items.find((i) => !i.completed)?.key;           // fallback (only in-grace items left)
```

Timeline example, reminder at 9:00:
- 8:59 → row visible, highlighted (it's the next).
- 9:00 → row still visible but **not** highlighted; the 9:15 row becomes highlighted.
- 9:05 → row drops into Completed section.

The 20-second `setInterval` in the `now` effect (line 130) drives re-render automatically.

Combined with task 2's `slice(0, 3)`, the panel always shows up to three rows (any in-grace passed ones included, since they're still in `upcomingItems`).

---

## 4. Reminder Announcements toggle — verified working, no code change

End-to-end trace (already correct):

1. **Store** — `src/lib/settings-store.tsx`
   - line 90: `useState<boolean>(true)` (default ON)
   - line 108–109: rehydrates from `localStorage["announcementsEnabled"]`
   - lines 139–142: `setAnnouncementsEnabled` writes state + persists

2. **Settings UI** — `src/routes/settings.index.tsx` lines 117–122
   ```tsx
   <SettingCard
     icon={<Volume2 …/>} label="Reminder Announcements"
     on={announcementsEnabled}
     onToggle={() => setAnnouncementsEnabled(!announcementsEnabled)}
   />
   ```

3. **Effect on voice** — `src/routes/elder.tsx` lines 136–162
   ```tsx
   useEffect(() => {
     if (!now || !announcementsEnabled) return;   // ← gate; OFF = no speak() call
     …
     speak({ data: { text } }).then((res) => {
       const audio = new Audio(`data:${res.mime};base64,${res.audio}`);
       audio.play().catch(() => {});
     });
   }, [now, reminders, announcementsEnabled, elder.name]);
   ```

So: **OFF** → effect early-returns, no audio is generated or played. **ON** → every 20s the scheduler checks each reminder's `times` × `DEFAULT_ANNOUNCEMENT_OFFSETS` and on the matching minute calls the `speak` server function (`src/lib/talk.functions.ts`) and plays the returned base64 audio. The `announcedRef` Set dedupes so each (date|reminder|time|offset) fires at most once per day.

Scope: this toggle controls **only** the scheduled reminder voice-overs. It does NOT affect the Talk-to-Text chat popup, the call popup, or the Text Reader (task 5).

No code change required — the toggle already does exactly this.

---

## 5. Make Text Reader actually read on tap

Infrastructure exists at `src/components/text-reader.tsx` and is mounted in `src/routes/__root.tsx` (line 128). It already:
- only activates when `textReader === true`,
- skips `/`, `/onboarding`, `/carer` routes,
- intercepts clicks on `[data-readable="true"]`, highlights yellow, reads via `window.speechSynthesis`,
- cancels speech when you tap elsewhere,
- is SSR-safe (`typeof window` guard).

The reason it feels broken is **coverage** — most visible text lacks the `data-readable="true"` attribute. Add it in these spots:

### `src/routes/elder.tsx`

| Line | Element | Change |
|---|---|---|
| 258 | `<h1>` greeting | add `data-readable="true"` |
| 285 | `<span>Settings</span>` | add `data-readable="true"` |
| 377 | "Tap to Ask a Question" div | add `data-readable="true"` |
| 463 | "Completed Today (n)" button (wrap label in a span) | wrap text in `<span data-readable="true">…</span>` |

Inside **`ReminderDetailsPopup`** (lines 999–1150) — per your "yes" answer:

| Line | Element | Change |
|---|---|---|
| 1078 | reminder name `<h2>` | add `data-readable="true"` |
| 1100 | `timeStr` div | add `data-readable="true"` |
| 1105 | `frequency` div | add `data-readable="true"` |
| 1111 | `detailsText` div | add `data-readable="true"` |
| 1117 | `reminder.notes` div | add `data-readable="true"` |

`TalkToTextPopup` and `CallPopup` — leave untouched (per your "no").

### `src/routes/settings.index.tsx`

| Line | Element | Change |
|---|---|---|
| 76 | "Settings" `<h1>` | add `data-readable="true"` |
| 166 | label `<span>` inside `SettingCard` | add `data-readable="true"` |
| 73 | "Back to elder screen" `<span>` | add `data-readable="true"` |

After these additions, with the toggle ON, tapping any visible text on `/elder`, the reminder details popup, or `/settings` highlights it yellow and reads it aloud; tapping non-readable areas cancels in-progress speech. With the toggle OFF, the global listener is removed and behavior is normal.

---

## Out of scope / confirmed

- No changes to announcements logic (task 4 — verified working).
- No changes to `TalkToTextPopup` / `CallPopup` (per your answer).
- In-grace reminders keep normal styling, not faded (per your answer).
