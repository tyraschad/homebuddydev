# Small edits — onboarding / carer / elder polish

## 1. Pre-add Emergency contacts in `/carer`

`src/routes/carer.index.tsx` Phone Contacts card (~line 305): after `elder.contacts.map(...)`, render an **"Emergency"** subheading + two static read-only rows (911, 1-800-222-1222). No edit/delete. Hardcoded in component — not written to carer store.

## 2. Onboarding stepper — remove boxes, add connecting line

"How HomeBuddy Works" (lines 277–296): replace `<HowCard>` boxes with circle-icon + title + 1-line body, joined by a 1px green horizontal line. Mobile (<640px): vertical stack with vertical connector. No card backgrounds.

## 3. Needs Assessment — even 4×2 grid + responsive

Lines 360–364: change grid to `repeat(4, 1fr)` ≥768px, `repeat(2, 1fr)` below. Add media-query class in `styles.css`.

## 5. Background animation +10% opacity

`onboarding.tsx` line 224: `opacity={0.12}` → `0.132`.

## 6. `/elder` V1 — green background + white wordmark

- Upload `TextLogoWhite.png` → `src/assets/text-logo-white.png.asset.json`.
- V1 branch of `elder.tsx` (line 224, `!v2` path): page bg `#519D46`; in both V1 & V2 render white wordmark centered at top (180px wide).

## 7. Persistent dark-green wordmark in `/carer`

- Upload `TextLogoDarkGreen.png` → `src/assets/text-logo-dark-green.png.asset.json`.
- In `carer.index.tsx` sticky header, render wordmark (~160px) **above** the elder's name on every portal view.

## 8. Call buttons next to each phone number in CallPopup (V1 + V2 `/elder`)

The floating phone button opens the shared `CallPopup` in `src/routes/elder.tsx` (~line 754), used by both V1 and V2. Update `ContactRow` and `EmergencyRow` (lines 882–965):

- Convert from a single `<a href="tel:">` block to a flex row: **left** = name + number (text only, no longer a link), **right** = green pill **"Call"** button with `<Phone>` icon (lucide-react) that wraps the `<a href="tel:...">`.
- Button: green `#519D46` bg, white text, ~40px tall, rounded 8px, `aria-label="Call {name}"`. Hover darkens slightly.
- Keeps the same `tel:` dial behavior, just scoped to the button so the whole row no longer acts as one big link (clearer affordance, matches user expectation).
- Emergency rows get the same treatment (red-tinted variant optional — default to same green for consistency unless you'd prefer red for emergencies).

## Files touched

- **new:** `src/assets/text-logo-white.png.asset.json`, `src/assets/text-logo-dark-green.png.asset.json`
- **edit:** `src/routes/onboarding.tsx` (2–5), `src/routes/carer.index.tsx` (1, 7), `src/routes/elder.tsx` (6, 8), `src/styles.css` (3)

## Open questions

- **Q3 mobile:** OK with 2 columns on phones for Needs Assessment? (8 tiles → 4 rows of 2)
- **Q8 emergency:** Same green Call button for 911 / Poison Control, or red to signal urgency?