## Audit findings — onboarding text/background contrast

Onboarding always renders on a light green V2 background with white/translucent-white cards, but several spots still pull colors from the global `theme` (which goes dark when the user's saved appearance is `dark`). That produces white-on-white or near-illegible combos. The forbidden `#2A2A3E` also still lives in the dark theme token and leaks into onboarding modals.

### Issues to fix

1. **`SectionCard` toggle row (line 577)** — `background: theme.card`. In dark mode this is `#3A3A4E`, with `ONB_TEXT` (`#25483A`) label on top → unreadable. Force `background: "#FFFFFF"`.

2. **Condition chips (line 397)** — unselected branch uses `background: theme.card`. Dark mode gives a dark navy chip with dark-green text. Replace with `background: "#FFFFFF"`.

3. **Resume prompt (lines 249–266)** — already uses the onboarding `card` + `h1` + `muted` styles, which now resolve to `#25483A` text on white. Verified OK after the audit (no change needed).

4. **`ReminderForm` + `CategoryPicker` modals (lines 675–690)** — these components call `useSettings()` and style themselves with `theme.bg` / `theme.card` / `theme.text`. In dark appearance the modal renders with `#2A2A3E` background and white text; in light appearance it's white-on-white in places. Onboarding must always show these popups as white cards with dark text. Fix by passing a forced light theme in onboarding only:
   - Update `CategoryPicker` and `ReminderForm` (and the small `Field*` helpers they own) to accept an optional `themeOverride` prop. When provided, use it instead of `useSettings().theme`. Default behavior elsewhere (elder app, carer portal) is unchanged.
   - In `onboarding.tsx`, pass `themeOverride={{ bg: "#FFFFFF", card: "#FFFFFF", text: "#25483A", muted: "#5A6B5E", overlay: "rgba(0,0,0,0.5)" }}` to both.
   - Also replace the `isDark` heuristic in `reminder-form.tsx` (line 116) so it derives from the resolved theme, not the literal `#2A2A3E` string.

5. **Global elimination of `#2A2A3E`** (per "Never use 2A2A3E EVER"):
   - `src/lib/settings-store.tsx` line 18: change dark `bg` from `#2A2A3E` → `#25483A`; line 19 `card: "#3A3A4E"` → `#2D5A45` (lighter green surface) so dark-mode elder UI keeps contrast and no longer uses the forbidden navy.
   - `src/components/reminder-form.tsx` line 116: drop the `#2A2A3E` string compare; use `appearance === "dark"` from `useSettings()` instead.
   - `src/routes/elder.tsx` line 817: replace `#2A2A3E` with `#25483A`.

6. **Sanity sweep of onboarding text colors** — confirm every visible body/label/help string in `src/routes/onboarding.tsx` resolves to one of: `ONB_TEXT` (`#25483A`), `ONB_MUTED` (`#5A6B5E`), `#333333` (page default body), `#999999` (small helper), `TEAL` (`#25483A`), or `#C0392B` (error). Existing review of lines 124–166 and 278–935 confirms no other `theme.text`/`theme.muted`/`theme.bg`/`theme.card` references remain after fixes 1, 2, and 4. Header progress track (line 278) and page 1 step dot (line 182) use `#3A3A4E` purely as a non-text background — left as-is.

### Files touched

- `src/routes/onboarding.tsx` — lines 397, 577; add `themeOverride` props to the two modal usages (~675–690).
- `src/components/reminder-form.tsx` — thread optional `themeOverride` through `CategoryPicker`, `ReminderForm`, and their internal `Field*` helpers; remove `#2A2A3E` literal at line 116.
- `src/lib/settings-store.tsx` — swap dark theme `bg` and `card` hex values.
- `src/routes/elder.tsx` — replace `#2A2A3E` literal at line 817.

### Out of scope

- Carer portal styling (already V1 grey per memory).
- Elder app dark-mode color tuning beyond removing `#2A2A3E`.
- Any logic, copy, or layout changes.

### Verification

- Walk all 10 onboarding steps in both `light` and `dark` saved appearance; every body string should render `#25483A`/`#5A6B5E` on white/translucent-white.
- Open the resume prompt, the category picker, and the reminder form from inside onboarding — modals must be white with dark green text in both appearance settings.
- `rg "#2A2A3E|#2a2a3e" src` returns no matches.
