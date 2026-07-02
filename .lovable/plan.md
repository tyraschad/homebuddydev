## Scope

Rebuild visuals for all 6 pinned references — onboarding 1–5 (`src/routes/onboarding.tsx`) and Carer Portal (`src/routes/carer.index.tsx`) — against `continuity/design-refs/screens/`. Plus swap two logos from PNG to SVG. Audit (`continuity/onboarding-audit.md`) is the checklist.

## Confirmed decisions

- Background: **keep as-is** (no cream repaint).
- Dark mode branches inside onboarding: **drop**.
- Fonts: swap family to **Newsreader** for headings, **Inter** for body/buttons — **preserve existing weights** (no weight changes).

## Asset swaps (do first)

1. `lovable-assets create --file /mnt/user-uploads/text-logo-white.svg` → write to `src/assets/text-logo-white.svg.asset.json`; delete `src/assets/text-logo-white.png.asset.json`.
2. `lovable-assets create --file /mnt/user-uploads/text-logo-dark.svg` → write to `src/assets/text-logo-dark.svg.asset.json`; delete `src/assets/text-logo-dark-green.png.asset.json`.
3. Grep `src/` for the old pointer names and update imports to the new `.svg.asset.json` files.

## System-wide fixes

1. **Fonts** (family only, weights untouched):
   - `Georgia, serif` → `"Newsreader", serif` (all h1/h2, italic reassurance).
   - `Verdana, sans-serif` → `"Inter", system-ui, sans-serif` (body, labels, inputs).
   - `"Trebuchet MS", sans-serif` → `"Inter", system-ui, sans-serif` (buttons, calendar tabs, sub-section caps).
2. **Greens** — `#2F8F4E` → `#519D46` everywhere: `onboarding.tsx` `GREEN` const, `.hb-stepper::before` in `styles.css`, `GREEN` export in `src/components/reminder-form.tsx` (fixes carer Add Reminder too).
3. **Disabled Next button** — `#9CC2A9` → `#C9C4BC` (neutral grey).
4. **Secondary/Back button** — `borderRadius: 8` → `999`, solid `#FFFFFF`, `1px solid #E0DBD0`. Applies to onboarding Back and carer "View Elder Screen".
5. **Drop `appearance === "dark"` branches** inside onboarding.tsx only (needs card fill, progress track, etc.). Theme store, Elder, and Carer keep dark mode.

## Per-screen changes

- **S1 Entry** — Get Started `width: 100%`; add italic *"Don't worry — you can change any of this later."* above button.
- **S2 How It Works** — progress bar height 6→8, track `#E5DFD0`; stepper circles 48→40.
- **S3 Data** — card `borderRadius` 8→12; disabled Next per system fix.
- **S4 Needs** — selected fill `#E8F5E9` → `#CBE894` (Light Sage); border + check → `#519D46`.
- **S5 Review** — avatar 60→72; Edit button pill; toggle off `#888` → `#BBBBB0`; toggle on → `#519D46`.
- **S6 Carer Portal** — headings/body/tab fonts per system fix; "Add Reminder / Medication" → "Add Reminder"; "View Elder Screen" pill; Add Reminder green auto-fixes via `reminder-form.tsx` swap.

## Files touched

- `src/routes/onboarding.tsx`
- `src/routes/carer.index.tsx`
- `src/components/reminder-form.tsx` (GREEN constant)
- `src/styles.css` (`.hb-stepper::before`)
- `src/assets/*` — new SVG pointers, old PNG pointers removed
- Files importing the two old logo pointers (grep and update)

Not touched: `settings-store.tsx`, `GradientBackground.tsx`, Elder screen, theme tokens.

## Verification

Playwright at `/onboarding` (steps 1–5) and `/carer`, viewport 1280×1800, one screenshot per step, visual-diff against the 6 pinned references. Confirm: Newsreader headings, Inter body, sage `#519D46` accents, pill back buttons, sage-filled needs cards, grey disabled Next, "Add Reminder" label, new SVG logos render.
