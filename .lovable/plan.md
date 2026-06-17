# Plan

## 1. Elder V1 & V2 — never invent what to bring to an appointment

**Where:** `src/lib/talk.functions.ts`, `reminderChat` server function (the function that powers the elder reminder chat in both V1 and V2).

**What's happening today**

- Lines 143–150 build `reminderFacts` from the reminder's `name`, `type`, `time`, `dose`, `details`, and `notes`.
- Lines 152–156 (intro prompt) say: *"If notes mention what to bring, include that."*

There is no rule telling the model what to do when notes/details are empty — so Gemini fills the gap and makes up items ("bring your ID, insurance card, medication list…").

**Fix**

Tighten the system prompt so the model is grounded strictly in the reminder fields:

1. In `reminderFacts` (around line 149), if `r.notes` is empty, emit an explicit line like `Notes / what to bring: (none provided)` instead of dropping the field. Same for `details`. This way the model sees the absence as a fact.
2. Rewrite the `introInstruction` (lines 152–156) and `followupInstruction` (158–161) to add a hard rule:
   - "Only mention items to bring that appear verbatim in Notes or Details above. If neither field lists anything to bring, do NOT invent items. Instead say something like: 'I don't have a list of what to bring for this — check with your carer or the appointment letter.'"
   - "Never suggest generic items (ID, insurance card, medication list, water, etc.) unless they appear in the notes."
3. Apply the same rule to `followupInstruction` so the follow-up steps don't reintroduce invented items.

No UI changes; this is purely a prompt change and affects both V1 and V2 because both call the same server function.

## 2. /carer Instruction Context — allow spaces in the "What might they ask?" field

**Where:** `src/components/instruction-context-form.tsx`, line 199.

**Root cause**

The `onChange` runs `cleanQuickActionLabel(e.target.value)` on every keystroke. `cleanQuickActionLabel` (in `src/lib/carer-store.tsx` lines 67–84) calls `.trim()`, which strips the trailing space the user just typed. As soon as the user hits space, it disappears, so the next letter sticks to the previous word ("what" + space + "i" → "whati").

**Fix**

Stop cleaning on every keystroke; clean only when the value is committed.

1. Line 199 `onChange`: store the raw value — `setQuestions(questions.map((x, j) => j === i ? e.target.value : x))`. No trimming, no rewriting while typing.
2. Add `onBlur` to the same input that runs `cleanQuickActionLabel` on the final value, so the label rewrites (e.g. "How do I …" → cleaned form) still happen once the user leaves the field.
3. Saving already runs `cleanQs = questions.map(cleanQuickActionLabel).filter(Boolean)` at line 98, so persisted data stays normalized.

No other call sites change; `cleanDevices` (carer-store.tsx line 86) still normalizes on load.

## Out of scope / not doing

- Not touching the medication-reminder voice flow or the V2 completion animation.
- Not changing the `Device` schema or the questions-list UI beyond the typing behavior.
