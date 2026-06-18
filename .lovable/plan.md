# Bigger /elder text + remove text-size toggle

All changes are presentational and live in two files (plus deleting one unused route file). No business logic touched. Everything applies always (no toggle), per your answer.

## 1. Today's Reminders — much larger

**File:** `src/routes/elder.tsx`

- Section heading "Today's Reminders" (line 416): `fontSize: 18` → **28**.
- Upcoming reminder (the highlighted "next" card, lines 532–537):
  - Reminder name: `fontSize: 16` → **26**, keep bold.
  - Time + relative ("9:00 AM — in 2 hours"): `fontSize: 14` → **20**.
  - Icon (line 531): `size={20}` → **28**.
- Other upcoming items (lines 562–567):
  - Name: `fontSize: 16` → **22**.
  - Time: `fontSize: 14` → **18**.
  - Icon (line 561): `size={20}` → **24**.
- "Completed Today (n)" toggle row (lines 461–468) and completed item rows (lines 484, 493–495): bump from 14 → **18**, icon 20 → **22**, so the section stays proportional.

## 2. "Tap to Ask a Question" + mic — larger

**File:** `src/routes/elder.tsx`

- Mic circle (lines 114–115): `micSize` 150/120 → **200/170**, `micIconPx` 80 → **110**.
- Label (lines 385–391): `fontSize: 16` → **26**, keep bold.
- Card `minHeight` (line 359): 280 → **340** so the bigger mic isn't cramped.

## 3. Phone button — larger

**File:** `src/routes/elder.tsx`, the floating `.fab-phone` (lines 593–623)

- `width`/`height`: 64 → **88**.
- `Phone` icon `size`: 36 → **52**.
- `bottom`/`right`: 24 → **28** (keep clearance from edge).

## 4. Remove the text-size toggle

Reasoning: nothing in the running app links to `/settings/text-size`; `textSize` only drives the clock-card numbers on /elder. Removing it simplifies state and lets the new sizes be the single source of truth.

**Delete:** `src/routes/settings.text-size.tsx` (the auto-generated `routeTree.gen.ts` regenerates on next build — we don't hand-edit it).

**Edit:** `src/lib/settings-store.tsx`
- Remove the `TextSize` type, `mediumSizes`/`largeSizes`/`Sizes` exports, the `textSize`/`setTextSize` context fields, the related `useState`, the `localStorage` read/write, and drop them from the `value` memo + deps.

**Edit:** `src/routes/elder.tsx`
- Drop `textSize` from the `useSettings()` destructure (line 98).
- Replace lines 168–169 with fixed values: `const line1Size = 38;` (was 28/34) and `const line2Size = 60;` (was 44/53) — locking in the "always bigger" date/time on the clock card.

## Open items / risks

- `src/components/TalkToTextPopup.tsx` imports `sizes` from `useSettings` (line 199). It is destructured but I'll confirm it's unused before the build; if used anywhere, I'll inline the previous `mediumSizes` values there so the popup is unaffected.
- I won't touch the carer/onboarding/settings index routes; this is scoped to /elder presentation + dead-code removal of the text-size route and store fields.
