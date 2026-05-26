# Carer Portal Enhancement Plan

This is a large multi-feature update. I'll group it into 6 implementation chunks so it ships coherently. Storage stays in the existing `carer-store` (localStorage) — no DB migration since Lovable Cloud isn't enabled. If you want real DB sync, say the word and I'll enable Lovable Cloud as a follow-up.

## 1. Elder Profile Card — Expandable sections with inline edit

- Card header stays: avatar, name, age, single expand/collapse arrow.
- When expanded, render 3 collapsible **sub-sections**: Health Conditions, Notes, Phone Contacts. Each sub-section header shows a pencil (16px) on the right that opens a focused edit modal for just that section.
- Instruction Context is removed from this card (moved to its own card, see §2). No edit pencil for read-only data.
- Replace the single `EditProfileModal` with three smaller modals: `EditConditionsModal`, `EditNotesModal`, `EditContactsModal`. They reuse the existing form fields/validation.
- Fallback copy when empty: "No notes added", "No contacts added", "No health conditions added" (italic, muted).

## 2. Instruction Context — Standalone card

- New card directly below Elder Profile Card, same border/typography.
- Collapsed header: title "Instruction Context" + preview "{n} devices added" + arrow.
- Expanded body: list rows with 30×30 thumbnail + device name. Empty state: "No devices added".
- Edit pencil appears in header only when expanded → opens `EditInstructionContextModal`.
- Modal reuses the onboarding Page 7B flow: upload photo, simulated AI label, generate questions, list existing devices with edit/delete, Save/Cancel.
- Extract the device-entry UI from `onboarding.tsx` into `src/components/instruction-context-form.tsx` and import it from both onboarding and the new modal so behavior stays identical.
- Extend `ElderProfile` in `carer-store` with `devices: Device[]` (`{ id, name, photo, questions: string[] }`); onboarding completion writes into this field.

## 3. Calendar — "Go to today" floating button

- Pill button fixed at bottom-right of the calendar area (16px margin), 44px height, outline style with 1.5px border, Verdana 14px bold.
- Visible only when the viewed date/range is not today; smooth 0.3s opacity fade.
- Click resets the cursor based on view mode (day → today, week → week containing today, month → current month, list → scroll-to/today highlight).
- Respects light/dark theme.

## 4. Settings recovery + Tour entry

- Settings page was previously deleted. Restore a slim `/carer/settings` route with just:
  - **Back to setup** (outline 44px): visible only if `localStorage[homebuddy.onboarding.v2]` exists with `step < 10 && !completed`. Navigates to `/setup` (rename `/onboarding` → `/setup` via TanStack alias route).
  - **Restart setup** (outline 44px): opens confirm modal with "Cancel" + destructive "Yes, restart"; clears onboarding storage + carer data and navigates to `/setup`.
  - **Take tour** (outline 44px): clears `homebuddy.tour.completed` and re-runs the carer-portal tutorial.
- Add a small "settings" gear icon back to the carer header (top-right) linking here.

## 5. Tutorial tour (first visit)

- Add `src/components/portal-tour.tsx`: semi-transparent overlay + cutout highlight around each anchor element by ref, tooltip card (white/dark, 1.5px border, 14px) with copy from the spec, Next / Skip / Finish buttons.
- Steps in order: Header → Elder Profile Card → Instruction Context → Schedule Header → Calendar → Go-to-today button.
- Auto-start on first visit when `localStorage['homebuddy.tour.completed.v1']` is absent; mark completed on Finish/Skip.
- Re-triggerable via Settings → "Take tour".

## 6. Fallbacks, routing, and naming

- Routing: add `/setup` route that re-uses the onboarding component; keep `/onboarding` as a redirect for now. `/carer` and `/elder` already exist.
- Root redirect (`/`): if onboarding incomplete → `/setup`; else `/carer`. (Today it lands on the marketing index — I'll keep the index but add an auto-redirect when carer data is empty.)
- Confirm fallback strings everywhere: calendar empty day, list view empty, devices empty, notes empty, contacts empty.

## Out of scope (call out explicitly)
- Real backend / Lovable Cloud sync — staying on `carer-store` (localStorage). Mention this so we can enable Cloud as a separate task if you want true cross-device sync and the elder/carer screens to share a DB.
- Talk-to-Text integration on the elder screen — not changing elder UI in this pass beyond reading the same store. Happy to do it next if you confirm.
- Auth / login — no auth layer added (project has no auth today).

## Technical notes

- New files: `src/components/instruction-context-form.tsx`, `src/components/portal-tour.tsx`, `src/routes/carer.settings.tsx`, `src/routes/setup.tsx`.
- Edited files: `src/lib/carer-store.tsx` (add `devices`, tour flag helpers), `src/routes/carer.index.tsx` (split profile card, add IC card, today button, tour mount, settings gear), `src/routes/onboarding.tsx` (use shared instruction-context form, write devices into store), `src/routes/index.tsx` (redirect logic).
- No package additions; tour built with plain absolute-positioned overlay measuring anchor refs via `getBoundingClientRect()` + `ResizeObserver`.

Approve to proceed, or tell me which chunks to drop / reorder.