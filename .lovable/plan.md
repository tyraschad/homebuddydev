# Phase 1.5 — Device label + Phase 2 — Clarifying questions

Two stages. Stage A is a small adjustment to the existing photo flow. Stage B is the full Phase 2 build with the new "≥1 question unless the photo answers it" rule.

---

## Stage A — Brand + Type label on device capture

Goal: let the user tell us what the device is so image recognition gets it right (especially for unusual remotes/appliances), and so the AI has stronger context later. Same flow works in onboarding and Carer Portal because both use `DeviceListEditor`.

### Data model
- Extend `Device` (`src/lib/carer-store.tsx`) with optional `brand?: string` and `type?: string`. Keep existing `name` as the canonical display label (auto-filled by identify, editable). Migration-safe: both new fields optional, no breaking changes to existing devices.

### Capture flow (`src/components/instruction-context-form.tsx`)
New order:
1. **Upload photo** (existing button).
2. Photo preview appears with **two new inputs above the name field**:
   - `Brand` (e.g. Samsung, LG, Panasonic) — optional
   - `Type` (e.g. TV remote, microwave, landline) — required to enable Generate
3. **Generate questions** button (replaces the auto-identify-on-upload behavior). Disabled until `Type` is filled.
4. On click → calls `identifyDevice` with `{ dataUrl, brand, type }`. Response fills `name` and `questions` (uses `defaultQuestions(type)` if AI returns nothing useful).
5. **Re-identify** button stays for retries; **Save device** writes `{ name, brand, type, photo, questions }`.

Edge cases:
- User skips photo entirely → still works (just type Brand/Type/Name manually, no AI call). Save remains enabled.
- Editing an existing device → prefill brand/type if present.

### Server fn (`src/lib/identify-device.functions.ts`)
- Add `brand?: string` and `type?: string` to input validator.
- Prepend hint to prompt when provided:
  > "The user says this is a {brand} {type}. Use that as a strong hint; confirm or correct it based on the photo. Return the device name only."
- Keep return shape `{ name }`.

### Onboarding parity
- No code changes needed in `src/routes/onboarding.tsx` — it already mounts `DeviceListEditor`, so brand/type capture comes free.
- Carer Portal Instruction Context already uses the same component too.

---

## Stage B — Phase 2 clarifying questions (≥1 floor)

Goal: before returning steps for any device question, the AI asks **at least one** grounding question (e.g. "What's on the TV right now?"). It may skip the question only when the attached photo already answers it (e.g. user asks "what does this button do?" + photo clearly shows the button).

### New server fn — `clarifyOrAnswer` in `src/lib/talk.functions.ts`
- Input: existing `ContextInput` (now also carrying `brand`/`type` via device) plus `clarifyHistory: { role: "user" | "assistant"; content: string }[]` and `turnCount: number`.
- Two-tool schema, `tool_choice: "auto"`:
  - `ask_clarifying_question` → `{ question: string, quickReplies?: string[], expectsFreeText: boolean }`
  - `return_steps` → `{ steps: string[] }`
- System-prompt rules:
  - **Minimum 1 clarifying question per session** unless the attached photo clearly answers the only thing you'd need to ask. If photo answers it, you may go straight to `return_steps`.
  - Hard max: **2** questions (1 for cognitive/memory conditions).
  - Chip vs free-text mode per question:
    - Small known answer set (yes/no, on/off, channel, app) → 2-4 `quickReplies`, `expectsFreeText: false`.
    - Open-ended (what they see, channel number, name) → omit chips, `expectsFreeText: true`.
    - Always inject "Not sure" as a chip when chips are present.
  - Use `brand`/`type` to tailor the question ("On your Samsung remote, do you see the SOURCE button?").
- After `return_steps` is chosen, return `{ steps }` exactly like `generateSteps` does today, so the popup's step renderer keeps working unchanged.

### UI (`src/components/TalkToTextPopup.tsx`)
- Replace direct `generateSteps` call for device-flow questions with `clarifyOrAnswer`.
- New state: `clarifyHistory` (cleared on close / restart / device switch), `turnCount`.
- Render each AI question as an assistant chat bubble.
- Below it:
  - **Chip row** if `quickReplies` present — large tappable buttons, "Not sure" auto-added. Tapping a chip = same handler as typed/voice input.
  - **Text + mic composer is always visible** (reuses existing `transcribe` fn for voice answers).
- On user answer → append to `clarifyHistory`, increment `turnCount`, call `clarifyOrAnswer` again.
- When response is `return_steps` → render steps with the existing step UI.

### Condition-aware tweaks
- Low-vision: chip text size +2pt, higher contrast.
- Cognitive/memory: cap at 1 question, simpler wording (prompt already adapts via `buildSystem`).

---

## Order & verification

1. **Stage A first** — small, mechanical, isolated to one component + one server fn. Verify in onboarding and Carer Portal that brand/type capture and identify-with-hint both work.
2. **Stage B next** — net-new server fn + popup branch + chip row. Verify:
   - "How do I change the channel" with no photo → asks ≥1 question (likely "what channel are you on now?" with chips like NBC/CBS/Fox/Not sure), then asks for target channel via free text, then returns steps.
   - Same question on a device with a clear photo → may skip straight to steps if photo answers it; otherwise still asks 1.
   - Cognitive condition elder → max 1 question, simpler wording.

## Technical notes
- No DB schema changes (devices live in local store today).
- No new dependencies.
- No new secrets — reuses `LOVABLE_API_KEY` and `GEMINI_API_KEY`.
- `reminderChat` flow untouched.
