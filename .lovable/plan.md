## Part A — Carer: pick a specific date when reminder does not repeat

In `src/components/reminder-form.tsx` (~L340-441 in the `RepeatSection` component), when `repeats` is `false`, render a one-time date picker below the toggle row that edits `r.oneTimeDate` (already on the `Reminder` type, currently defaulted to today when the toggle flips off at L351).

- Add a labeled `<input type="date">` styled to match the existing form inputs (Inter 14px, `buttonBorder`, 8px radius, theme background/text). Default `min` to today's `ymd(new Date())` so past dates can't be selected.
- Bind value to `r.oneTimeDate` and onChange to `setR({ ...r, oneTimeDate: e.target.value })`.
- Add matching validation in the validate block (~L151): when `r.repeats === false`, require `oneTimeDate` (non-empty) and show inline error using the existing `errStyle`. Add `"oneTimeDate"` to `FIELD_ORDER` (L171) after `times` so the disabled-then-jump save flow scrolls to it.

No schema changes.

## Part B — Carer: smoother tutorial popup transitions

In `src/components/portal-tour.tsx`:

- Stop wiping the highlight between steps. Today `measure()` calls `setRect(null)` when the element isn't found yet, then updates 250ms later — this flashes a full black overlay. Instead, keep the previous rect until the next one is measured; only clear when the tour ends.
- Animate the tooltip position/size the same way the cutout already animates: wrap the tooltip's `top/left/opacity` in a 250ms ease transition. On step change, briefly set `opacity: 0`, wait for the new rect, then fade back in (single `useEffect` keyed on `idx`).
- Smooth the cutout jump by keeping the `boxShadow` overlay mounted continuously (drive `top/left/width/height` on the same element) rather than swapping between the cutout `<div>` and the full-screen fallback on every step. The full-screen fallback only renders when `steps` is empty.
- Increase `scrollIntoView` settle time from 250ms → 350ms and re-measure once more after the scroll finishes, so tooltips don't land offset from their target on longer pages.

No API or step-definition changes — existing call sites keep working.

## Part C — Elder: never let voices overlap

In `src/components/TalkToTextPopup.tsx`:

- Guarantee barge-in on mic start. Both mic buttons (~L960 and ~L1011) currently call `recorder.start()` without stopping TTS. Wrap the "start recording" branch in a small helper `startRecording()` that calls `stopTTS()` first, then `void recorder.start()`. Replace both onClick handlers with it.
- Guarantee barge-in on Next. `advanceGuide` (L637) already calls `stopTTS()`; also call it from the Next button onClick path (L817) before triggering `advanceGuide(1)` / `finishGuide()` so a rapid double-tap can't leave a stale utterance running while a new one starts.
- Harden `playTTS` (L268): serialize plays with a monotonically-increasing `playIdRef`. On entry, increment the id and capture the local value; after `await callSpeak(...)` resolves, bail out if `playIdRef.current !== localId` (a newer play or a `stopTTS`/mic-start superseded it). This prevents the race where two `playTTS` calls fire in quick succession (e.g. Next pressed while an answer is still being fetched) and both eventually call `a.play()`.
- Update `stopTTS` to also bump `playIdRef` so any in-flight `callSpeak` promise resolves into a no-op.

No changes to the server `speak` function or the recorder hook.

## Files touched

- `src/components/reminder-form.tsx` — one-time date picker + validation
- `src/components/portal-tour.tsx` — persistent rect, tooltip fade, longer settle
- `src/components/TalkToTextPopup.tsx` — `startRecording` helper, Next barge-in, `playIdRef` guard
