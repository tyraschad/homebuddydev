# Fix Tap-to-Talk button (Elder Chat)

Scope: `src/components/TalkToTextPopup.tsx` mic button and `src/lib/use-voice-recorder.ts`. V2 visuals stay as-is. No backend changes.

## 1. V1 button styling

Today (lines ~687–708): circle background `#FFFFFF` with a transparent border, mic icon `#000000`, label color `#FFFFFF`. On the white card background the circle disappears and the label is invisible — that's the "white on white" the user is seeing.

Change V1 (when `!v2`) only:
- Circle: `background: #000000`, no border (or `2px solid #000000`).
- Mic icon: `color: #FFFFFF`.
- Recording-state ring: keep the pulsing animation; use a white inner ring on the black circle.
- Label text: `color: #000000`, `fontFamily: Inter`, `fontWeight: 700`, keep size 14. Recording state stays red (`#FF3B30`).
- Outer button card: keep white background so the black circle reads as a strong target.

V2 styling (white circle + teal border + teal mic + teal label) is unchanged.

## 2. Tap-to-talk not firing

The click handler calls `void recorder.start()` which awaits `getUserMedia` then constructs `MediaRecorder`. On some browsers the gesture context is lost across the await, and any failure is swallowed because the UI never surfaces `recorder.error` — the button just looks dead.

Fixes:
- Surface `recorder.error` in the label area so a permission denial or unsupported-browser error is visible instead of silently reverting to "Tap to Ask a Question".
- In `useVoiceRecorder.start`, call `navigator.mediaDevices.getUserMedia(...)` as the first synchronous statement of the click-driven path (already is), and construct `MediaRecorder` immediately after the awaited stream resolves — no extra awaits in between. Set `status` to a transient `"starting"`/keep `"idle"` until the recorder actually starts so a second tap during permission prompt can't double-fire.
- Guard against double-start: if `status === "recording"` or a stream is already live, ignore subsequent `start()` calls.
- On `NotAllowedError` / `NotFoundError` / `SecurityError`, set a specific error message and keep button enabled so the user can retry.
- Confirm the button is not being blocked by `disabled` at idle (it isn't today, but verify after the status change above).

## 3. Verification

- V1: black circle, white mic, black bold Inter "Tap to Ask a Question" label, visible on white card.
- V2: unchanged visuals.
- Click mic → browser permission prompt appears → status flips to recording → tap again stops and transcribes.
- Deny permission → red error label appears under the mic, button still tappable to retry.

## Technical notes

- Only the mic `<button>` block (`TalkToTextPopup.tsx` ~676–709) and `useVoiceRecorder.ts` change.
- No new dependencies; uses existing `MediaRecorder` + `transcribe` server fn.
- Keep the existing `ttt-pulse` / `ttt-big-pulse` keyframes; just swap the ring color for V1.
