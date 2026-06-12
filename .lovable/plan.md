# Smarter device matching + more accurate steps

Two small, independent improvements. Both land in `talk.functions.ts` + the popup.

---

## 1. Smarter device matching (keywords → AI fallback)

Today `matchDevice` in `TalkToTextPopup.tsx` only matches when the query contains the device's literal name or the first 8 chars of a saved question. "How do I change the input" never matches a "TV remote" device, so no photo and no device context get passed to the AI.

### Keyword pass (in-component, no AI call)
Add a small keyword table keyed on the device's `type` field (now captured in Stage A) and `name` fallback:

```
TV / remote     → tv, remote, channel, input, source, hdmi, volume, mute, netflix, youtube, prime, cable, antenna
Phone           → phone, call, dial, answer, voicemail, contact, hang up
Microwave       → microwave, heat, warm, reheat, timer, defrost, popcorn
Thermostat      → thermostat, temperature, heat, cool, ac, warmer, cooler
Stove / oven    → stove, oven, burner, bake, broil, preheat
Washer/dryer    → washer, dryer, laundry, wash, spin, dry
Lights / lamp   → light, lamp, brightness, dim
```

For each device, build its keyword set from (type, name, saved questions). Score every device against the query; pick the highest scorer over a small threshold.

### AI fallback (one cheap call)
If no device scores above threshold AND the elder has ≥1 device with photo/questions, call a new lightweight server fn `routeDevice` (Gemini Flash, no image needed) with the query + the device list `[{id, name, brand, type}]`. It returns `{ deviceId: string | null }`. Cache the answer for the session so re-asking the same query doesn't re-route.

### Wire-up
- `matchDevice(query)` becomes async-friendly: keyword pass first (sync). If no hit and devices exist, await `routeDevice`. If still null, fall through to `answerQuestion` as today.
- The matched device flows into `startGuide` exactly like before, so the instruction panel automatically shows `guide.device.photo` (already implemented).

---

## 2. More accurate steps (photo-grounded + verification checkpoints)

Two prompt changes in `generateSteps` (and the `clarifyOrAnswer` `return_steps` branch):

### A. Photo-grounded button names
When `device.photo` is attached, add to the system/user prompt:

> "Look at the attached photo. When you reference a button, name it EXACTLY as it appears on the device (label, color, and rough position — e.g. 'the SOURCE button, top-right, blue'). If you cannot read a label from the photo, describe its shape and position instead. Do NOT invent button labels."

This is a prompt-only change; the photo is already passed.

### B. "You should now see…" checkpoints
Append to the steps instruction:

> "After any step that changes what's on screen or what the device shows, include a short verification cue starting with 'You should now see…' or 'You should now hear…'. Keep it to one short sentence inside the same step (do NOT add a separate confirmation step)."

This keeps step count the same (3-5) but each visually-changing step gains a built-in check.

### Apply to both paths
- `generateSteps` handler — add both rules to `userPrompt`.
- `clarifyOrAnswer` system rules — same two bullets so the `return_steps` tool output uses them.
- Also fold in the user's clarifying-question answers explicitly: the `clarifyHistory` already flows into the model, but add to the system prompt: *"Use the user's answers above to make the steps concrete (e.g. if they said channel 7, write 'press 7 then OK', not 'press the desired channel')."* — small nudge, big effect.

---

## Verification

1. Ask "how do I change the input on the TV" on an elder whose only device is a "TV remote" (with photo). Expected: device matched via keywords, instruction panel shows the remote photo, steps reference real button labels visible in the photo (e.g. SOURCE, INPUT), and include "You should now see the input list on screen."
2. Ask "what should I press to call mom" with a saved "Landline phone" + a contact. Expected: phone matched via AI fallback (no obvious keyword), photo shown, steps reference visible buttons.
3. Ask "what's for dinner" → no device match, falls through to `answerQuestion` as today.

## Technical notes

- New server fn `routeDevice` reuses `LOVABLE_API_KEY` + Gemini Flash, text-only, small JSON output. Cheap (~1 cent per 1000 calls).
- No DB changes, no new secrets, no UI layout changes — the instruction panel already renders `guide.device.photo`.
- Keep the existing `clarifyOrAnswer` `≥1 question` floor and 2-question cap.
