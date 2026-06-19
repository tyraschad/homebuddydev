## Onboarding restructure + Welcome animation

### Flow (6 steps, down from 10)

```
1. Welcome             (icon → animated "homebuddy" wordmark)
2. How HomeBuddy Works (3 icon-in-circle cards, reflects new short flow)
3. About you + loved one (combined, side-by-side)
4. Needs Assessment    (4-across square tiles, icon-on-top)
5. Review + suggested ecosystem (combined; editable + settings toggles)
6. (cut — folded into 5)
```

Removed: Reminders, Instruction Context, Phone Numbers, standalone Summary. Carer can add those from the portal later (see Portal section).

---

### Step 1 — Welcome: signature write-on animation

Replace the `HomeIcon` circle with the uploaded `Vector.png` wordmark, animating in Apple-signature style. The CSS you provided works — porting it to React with these changes:

- **Asset handling**: upload `Vector.png` via `lovable-assets create --file /mnt/user-uploads/Vector.png --filename homebuddy-wordmark.png > src/assets/homebuddy-wordmark.png.asset.json`, then `import wordmark from "@/assets/homebuddy-wordmark.png.asset.json"` and use `wordmark.url`. (Not dropped in `/public` — keeps the repo clean.)
- **Duration**: 1.35s → **1.8s** (slower, more deliberate signature feel). All three keyframe animations bumped together so the ink head and settle stay synced with the clip-path reveal.
- **Easing**: keep `cubic-bezier(.16, 1, .3, 1)` (the "ease-out-expo-ish" curve — what Apple uses for hero motion).
- **Implementation**: new component `<HomebuddyWordmark />` in `src/components/homebuddy-wordmark.tsx`. Returns the wrap/img markup plus a scoped `<style>` block with the three `@keyframes` (keyframes can't live in inline `style={}`). Class names prefixed `homebuddy-` to avoid global collisions.
- **Accessibility**: wrap respects `@media (prefers-reduced-motion: reduce)` — animation skipped, logo shown final state immediately.
- **Layout swap in `src/routes/onboarding.tsx` step 1**: drop the 96px circle + `<HomeIcon>`, render `<HomebuddyWordmark />` in its place. Keep the "Custom care for elders at home" tagline and "Set up a personalised care ecosystem…" copy unchanged. "Get started" button unchanged.
- **`HomeIcon` import** removed from onboarding.tsx (no other usage there).

The three keyframes (`homebuddy-write-on`, `homebuddy-ink-head`, `homebuddy-settle`) and all CSS values are copied verbatim from your snippet, only the `1.35s` durations swapped to `1.8s`.

---

### Step 2 — How HomeBuddy Works
Three horizontal cards, each: icon-in-circle (56px, light grey bg, green icon) + short title + one-line subtitle. No bullet lists.
- `User` → "About you" / "Tell us who you are and who you're caring for."
- `HeartPulse` → "Their needs" / "Pick the conditions that apply."
- `Check` → "Review & launch" / "Confirm the setup and we'll personalise the app."

### Step 3 — Combined About page
Two-column grid (`gridTemplateColumns: 1fr 1fr`, gap 24, stacks to 1 col under ~640px).
- Left: H2 "Fill out information about you", field "Your name (carer)*".
- Right: H2 "About the person you're caring for", PhotoField, "Their name*", "Notes (optional)" textarea.
- Next enabled when both names non-empty. Photo + notes optional.

### Step 4 — Needs Assessment
- Subtitle: "Choosing these conditions will help us adjust settings according to specific needs. Select all conditions that apply to {elderName}."
- Grid: `repeat(4, 1fr)`, gap 12, tiles `aspectRatio: 1`, flex column centered, icon top (28px), label below (13px, centered). Selected = green border + green tint + check badge top-right. Requires ≥1.

### Step 5 — Combined Review + Ecosystem
- H1: "{elderName}'s HomeBuddy"
- **Profile summary card** with inline "Edit" toggle: photo, name, notes, condition chips → expands to inline form (same fields as step 3 right column + condition picker as chip toggles) → saves back into `data`.
- **Suggested ecosystem** section: existing `suggestRecommendations(conditions)` cards.
- **Adjusted settings** section: existing 3 ToggleRows.
- Footer: "View your portal" (primary) and "View the screen {elderName} will see" (secondary). Both call existing `handleFinish()`.

### Header / progress
`TOTAL` 10 → 6. Progress math unchanged.

### Data shape
`OnbData` keeps `reminders`, `devices`, `contacts`, `emergencyVisible` fields (unused by UI) so `handleFinish()` doesn't change and resumed v2 localStorage still parses. On hydrate, clamp `step` to ≤ `TOTAL` (drops users mid-flow onto the new Review page with data intact).

---

## Portal updates (`src/routes/carer.index.tsx`)

### Inline empty states
- **Profile → Phone Contacts**: when contacts empty → centered prompt + green "+ Add phone contact" button (opens existing editor).
- **Instruction Context**: when `elder.devices` empty → prompt + "+ Add a device" (existing `DeviceListEditor` add flow).
- **Calendar/Schedule**: when `reminders` empty → callout above calendar + "+ Add reminder/medication" (existing reminder picker).

Each: light grey panel, centred text, primary green button. Disappears the moment the user adds anything (driven off store state).

### Info button beside Settings
- Add `Info` (lucide) button to the LEFT of Settings in the header. Same secondary style. `aria-label="Restart tutorial"`. onClick → `clearTour()` + `setTourOpen(true)`. New `infoRef` for the tour.

### Tour content
1. Welcome (headerRef)
2. Elder Profile (profileRef) — points at "+ Add phone contact"
3. Instruction Context (icRef) — encourages "+ Add a device"
4. Schedule (scheduleRef) — encourages "+ Add reminder/medication"
5. Calendar (calendarRef)
6. **NEW** Info button (infoRef) — "Tap this Info button anytime to restart this tutorial."

Auto-shows on first portal visit via existing `hasCompletedTour()` — no change there.

---

## Files changed

1. **`src/components/homebuddy-wordmark.tsx`** (new) — animated wordmark component with scoped keyframes.
2. **`src/assets/homebuddy-wordmark.png.asset.json`** (new) — CDN pointer for Vector.png.
3. **`src/routes/onboarding.tsx`** — large refactor: replace step 1 icon with `<HomebuddyWordmark />`; drop steps 7/8/9; rewrite steps 2, 3+4 → 3, 5 → 4, 6+10 → 5; `TOTAL = 6`; remove unused `RemindersPage` / `DevicesPage` / `PhoneNumbersPage` helpers and unused imports (`HomeIcon`, reminder/device imports).
4. **`src/routes/carer.index.tsx`** — `infoRef`, Info button, empty-state blocks in three sections, extended `tourSteps`.
5. **`src/components/portal-tour.tsx`** — no changes (already exports `clearTour`).

## Not doing
- No backend changes — still localStorage.
- No animation on other onboarding steps (only the welcome wordmark).
- Not auto-opening add dialogs from tour steps — buttons just become visible.

## Risks
- Users with in-progress v2 onboarding past step 6 → clamped to step 6 with their data intact.
- Inline profile editing on Review page is dense → collapsed behind "Edit" button by default.
- `clip-path` write-on is well-supported in evergreen browsers; reduced-motion users see the final wordmark immediately.
