## Problem

In `src/routes/onboarding.tsx`, body/card text uses `theme.text` and `theme.muted` from the settings store. When the user's saved appearance is dark, `theme.text` is white — but the onboarding cards are always white (V2). Result: white text on white cards. Also, the page-level `TEAL` accent (`#1B5E5E`) is close to the disallowed `#2A2A3E` navy and should be replaced with the brand dark green `#25483A`.

## Changes (single file: `src/routes/onboarding.tsx`)

1. **Replace TEAL token**
   - `const TEAL = "#1B5E5E"` → `const TEAL = "#25483A"` (used by `h1` and `btnSecondary` text — both sit on the green/white onboarding background).

2. **Stop reading `theme.text` / `theme.muted` inside onboarding.** Introduce two local constants and substitute everywhere in the file:
   - `const ONB_TEXT = "#25483A"` — replaces every `color: theme.text`
   - `const ONB_MUTED = "#5A6B5E"` — replaces every `color: theme.muted` (and `<Camera color={theme.muted} />` icons)
   - Affected lines include the page header `h1`, SectionCard text prop, condition labels, reminder/contact rows, summary blocks (~lines 281, 302–306, 397, 428, 547, 550, 577, 659–660, 785–787, 817–818, 835–838, 845, 852, 861–864, 870, 885–888, 894, 908, 933).
   - Where a row currently sets `background: theme.bg` on a chip/button inside a white card (line 845), change to `background: "#FFFFFF"` so its text remains legible.

3. **Resume-onboarding popup and any in-onboarding modal**
   - Audit the resume prompt and any modal opened from onboarding (ReminderForm via `ModalShell`, CategoryPicker). Force modal body text to `#2A2A3E` (or black) on a white background. ModalShell already renders white; only ensure the text color inside onboarding-supplied modal children uses `#2A2A3E`, not `theme.text`.

4. **Leave the global settings store alone.** `settings-store.tsx` still defines `bg: "#2A2A3E"` for the dark elder theme — that's the elder app surface color, not onboarding text, and is out of scope.

## Out of scope

- Elder app, carer portal, and any non-onboarding screens.
- No new components, no logic changes, no settings/store edits.

## Verification

- Visually walk steps 1–10 of onboarding in both light and dark saved appearance settings; confirm all card/body text renders in `#25483A` and headings/secondary buttons use the new `TEAL` (`#25483A`).
- Open the resume prompt and a reminder modal from within onboarding; confirm white background with dark text.
