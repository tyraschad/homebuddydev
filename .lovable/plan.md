# AI chat upgrades: device photos + context-aware clarifications

Two sequential phases. Both are doable with the existing Lovable AI Gateway + Gemini Flash setup — no new dependencies, secrets, or DB tables.

## Phase 1 — Wire device photos into the AI calls

Send the uploaded device photo to the model so it can give visually accurate steps ("press the RED button bottom-left") instead of generic guesses.

Doable because: Gemini Flash is multimodal, the Gateway is OpenAI-compatible, photos are already stored as data URLs in `device.photo` and already flow through `TalkToTextPopup.tsx` line 349 into `ContextInput`. The field just isn't read in the handler.

### Steps

1. `**src/lib/talk.functions.ts` — `generateSteps` handler (~line 40-50)**
  Build a multimodal user message when a photo exists:
   Add to `userPrompt`: "The attached photo shows the device — use it to give accurate visual cues (button color, position, labels)."
2. `**src/lib/talk.functions.ts` — `answerQuestion` handler (~line 90-100)**
  Same multimodal pattern.
3. **Leave `reminderChat` alone** — it intentionally avoids mentioning devices.
4. **(Recommended) Downscale on upload** in `src/routes/onboarding.tsx` `PhotoField` (~line 516). Canvas resize to ~1024px long edge, re-export `toDataURL("image/jpeg", 0.8)`. Avoids 413/timeout on big phone photos. Frontend-only.
5. **Verify**: open the popup on an elder with a device that has a photo, ask "how do I use the remote", confirm response references visible details (button colors, layout). Check network tab for `image_url` block.

---

## Phase 2 — Context-aware clarifying questions (with hybrid input)

Before returning steps, the AI may ask 1-2 short clarifying questions to ground the answer in the user's current situation. Each question supports **both** quick-reply chips and free text/voice — user picks whichever is faster.

### How it works

1. New server fn `clarifyOrAnswer` replaces the direct `generateSteps` call for device questions.
2. AI decides one of two tool calls per turn:
  - `ask_clarifying_question` → `{ question, quickReplies?: string[], expectsFreeText: boolean }`
  - `return_steps` → `{ steps: string[] }` (final, ends the loop)
3. Popup renders the question as an assistant bubble. **Below it:**
  - If `quickReplies` present → row of large tappable chips (with auto-injected "Not sure" chip).
  - The existing text+mic composer is **always visible** — user can type or hold-to-talk for open-ended questions like "what are you trying to cook?".
4. User answer (tap, typed, or transcribed via existing `transcribe` fn) is appended to `clarifyHistory` and sent back to `clarifyOrAnswer`. Loop continues until `return_steps`.

### System prompt rules (capped behavior)

- Max **2** clarifying questions total (1 for cognitive/memory conditions).
- Pick the answer mode per question:
  - Small known answer set (yes/no, on/off, device state) → 2-4 `quickReplies`, `expectsFreeText: false`.
  - Open-ended (what they see, what they want, a name) → omit chips or only 1-2 hints, `expectsFreeText: true`.
  - Always include "Not sure" as a chip when chips are present.
- **If a device photo is attached, skip visual questions** and use the image instead. Compounds with Phase 1.
- Condition-aware: low-vision → larger chip text; cognitive → max 1 question, simpler wording.

### Implementation

1. `**src/lib/talk.functions.ts**` — new `clarifyOrAnswer` server fn with two-tool schema (`ask_clarifying_question` + `return_steps`), `tool_choice: "auto"`, takes `clarifyHistory: {role, content}[]` in addition to existing `ContextInput`.
2. `**src/components/TalkToTextPopup.tsx**`:
  - New state: `clarifyHistory`, cleared on close/restart.
  - Chip row component above the existing composer; chips call same handler that typed/voice input uses.
  - Reuse existing `transcribe` fn for voice answers — no new server work.
  - Keep mic + text input visible for every clarification turn.
3. **Verify**: ask "how do I change the input" (no photo) → expect 1-2 chip-style questions then steps. Ask "what should I cook for dinner" → expect open question with composer focused. Ask same device question after adding photo → expect fewer/no questions.

---

## Recommended order

**Phase 1 first.** Reasons:

1. Photos shrink the question count — tune clarifications against what the AI still can't see, not against blind guessing.
2. Phase 1 is ~30 min mechanical; Phase 2 is bigger (new server fn, tool branch, UI state, chip row). Land the small win first.
3. Sequential = easier to attribute regressions.