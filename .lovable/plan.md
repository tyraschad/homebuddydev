## Scope

Four targeted changes across `src/routes/onboarding.tsx`, `src/routes/carer.index.tsx`, `src/components/reminder-form.tsx`, and `src/routes/elder.tsx`.

### 1. Editable elder age (+ name) in onboarding

- Extend `OnboardingData` with `elderAge: string` (number stored as string for input control).
- Step 1 "About" — add an "Age" number input next to "Their name" (name field already editable; keep as-is).
- Step 5 "Review" edit panel — add matching "Age" input alongside existing name/notes fields.
- On finish, write `elderAge` into the carer store elder record. Since the store uses `dob`, derive a synthetic dob (`YYYY-01-01` from today minus age) only if the carer hasn't already set a real DOB; otherwise keep dob and just store the age display. Simpler: add `age?: number` field to the `Elder` type in `src/lib/carer-store.tsx`, prefer it over dob-derived age in `ageFromDob` display sites.

### 2. Phone contact confirmation (Carer portal)

- In `carer.index.tsx` phone-contacts editor (around lines 1273-1280), when the user hits "Save" on the contacts editor, show a small confirmation modal listing each new/edited contact with name + number, and a "Confirm" / "Back to edit" pair. Only persist after Confirm.
- Reuse `ModalShell` styling from `reminder-form.tsx` for consistency.
- Basic validation: strip whitespace, require at least 7 digits after normalization; block confirm otherwise with inline error.

### 3. Reminder form: disabled save + jump-to-unfilled

In `src/components/reminder-form.tsx`:

- Compute `isFormValid` (same rules as `validate()` but pure, no side effects).
- Render the "Save reminder" button with `disabled` styling (grey bg, `cursor: not-allowed`, `aria-disabled`) when `!isFormValid`. Do NOT set the native `disabled` attribute — we still need click to fire.
- On click while invalid: run `validate()`, then find the first field with an error in DOM order (name → timesPerDay → times → repeatSchedule → monthlyDates/customDays), scroll it into view (`scrollIntoView({ behavior: "smooth", block: "center" })`), and focus it. Add `ref`s or `id`s per field to enable this.
- When valid, behaves exactly as today (dose warning modal etc.).

### 4. Reminder details popup: structured labels

In `ReminderDetailsPopup` (`src/routes/elder.tsx` ~L963):

- Header area: icon + reminder name only, separated from body by a thin divider (`1px solid #D0D0D0`, `margin: 12px 0`).
- Body: labelled rows, each `Label: value`, `Inter 16px`, label bold `#25483A`, value regular. Rows rendered conditionally:
  - **Time:** always (`timeStr`).
  - **Frequency:** always (existing `frequency`).
  - **All times:** show when the reminder has >1 daily time; formatted list from `reminder.times`. Requires passing `times: string[]` into the popup from the call site (line 547).
  - **Dose:** medication only, `{dose} pill(s)`.
  - **Location:** appointments only, from `reminder.details` (rename accordingly for that type).
  - **Notes:** when present. Keep existing green note card styling but preface with "Notes:" label.
- Drop the current combined `detailsText` line.
- Update `ReminderDetailsPopup` props type to include `times: string[]` and pass through from `openItem.reminder.times`.

## Non-goals

- No changes to the reminder data schema in `carer-store.tsx` beyond optional `age` on Elder.
- No visual redesign of the reminder form beyond the disabled state.
- No changes outside these four items.

## Technical notes

- Font stays Newsreader (headings) + Inter (body), per project memory.
- Colours: primary `#519D46`/`#6BA24A`, text `#25483A`, borders `#D0D0D0`. No `#2A2A3E`.
- All new inputs mirror existing `inputStyle` in onboarding for visual consistency.
