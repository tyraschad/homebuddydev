# Simplify the elder voice flow (cognitive-accessibility first)

## Goal

Reduce the voice flow from **4 taps** (open popup → start → stop → send) to **2 taps with a safety net**:

**Tap card → speak → (auto-stops on silence) → see what was heard → tap big Send (or Redo)**

Designed for cognitively challenged elders: minimize decisions, always confirm before sending, give multi-sensory feedback, never auto-dismiss.

## Scope

- Touched: `src/routes/elder.tsx` (the "Tap to Ask a Question" card), `src/components/TalkToTextPopup.tsx` (the chat overlay), `src/lib/use-voice-recorder.ts` (add silence detection).
- Untouched: reminders, phone FAB, layout, carer screens, settings, server functions.

## New flow

```text
/elder screen
  ┌──────────────────────────────────┐
  │  [pulsing mic card]              │
  │  Tap to Ask a Question           │   ← tap 1
  └──────────────────────────────────┘
            ↓ (starts recording inline, no popup)
  ┌──────────────────────────────────┐
  │  ◉ Listening…   [ STOP ]         │   waveform/pulse
  └──────────────────────────────────┘
            ↓ (1.8s of silence auto-stops, OR tap STOP)
  ┌──────────────────────────────────┐
  │  I heard you say:                │
  │  "What time are my pills?"       │
  │                                  │
  │  [   ✓  SEND   ]   ← tap 2       │
  │  [   ↻  Redo   ]                 │
  └──────────────────────────────────┘
            ↓ (Send) — popup opens with the message already sent
            ↓ (Redo) — re-records, no popup, no scolding
```

## Changes

### 1. `src/routes/elder.tsx` — recording lives on the card

- Replace the current "tap to open popup" handler on the Ask card with inline recorder state: `idle → recording → confirming → sending`.
- `idle`: shows "Tap to Ask a Question" + large mic icon (current visual).
- `recording`: card swaps to a pulsing ring + "Listening…" + a giant red **Stop** button (still tappable for elders who want manual control). Soft chime on start.
- `confirming`: card swaps to "I heard you say:" + transcript in 26pt text + two full-width buttons: **Send** (large, primary green) and **Redo** (outline, below). No auto-dismiss, no timer.
- On **Send**: open `TalkToTextPopup` with the transcript pre-submitted (new `initialMessage` prop) so the elder lands in the chat with the assistant already answering.
- On **Redo**: discard transcript, return to `recording` immediately.

### 2. `src/lib/use-voice-recorder.ts` — silence auto-stop

- Add an optional `{ autoStopSilenceMs?: number, onSilence?: () => void }` option.
- Use a `WebAudio AnalyserNode` on the mic stream; track rolling RMS. When RMS stays below threshold for the configured window (default **1800ms**), call `stop()` and fire `onSilence`.
- Minimum recording length of 800ms before silence detection arms (prevents instant cut-off if the elder pauses before speaking).
- Keep manual `stop()` working unchanged so existing callers don't break.

### 3. `src/components/TalkToTextPopup.tsx` — accept a pre-submitted message

- Add `initialMessage?: string` prop. When present, on mount: push as user message and immediately call the existing send pipeline (skip the "tap mic, then tap send" path entirely).
- Keep the popup's own mic for follow-up questions inside the chat — but apply the same auto-stop + confirm pattern (small refactor: extract a `VoiceCapture` component shared by `/elder` card and popup so behavior is identical everywhere).

### 4. Multi-sensory feedback (cognitive accessibility)

- **Visual**: pulsing ring around the card during recording; transcript in 26pt; Send button full-width and high-contrast green.
- **Audible**: short chime on record-start and record-stop (`new Audio()` with a tiny inline data-URI; no asset import needed).
- **Language**: "I heard you say:" (friendlier than "Transcript"), "Redo" (concrete; not "Cancel"), "Send" (not "Submit").
- **No timeouts** on the confirm screen.

## Explicitly NOT doing

- No auto-send without confirmation — too risky for cognitively challenged users.
- No confidence-based conditional confirm — unpredictable behavior is the enemy.
- No transcript editing (no keyboard surface) — adds a hidden third path.
- No changes to phone FAB, reminders, or any layout outside the voice card.
- No removal of the popup — it's still where the chat happens; we just stop forcing elders to tap a second mic to enter it.

## Risks & mitigations

- **Silence threshold misfires in noisy rooms** → ship a conservative 1.8s window + 800ms min length; expose threshold as a constant for easy tuning if real users hit issues.
- **Existing `useVoiceRecorder` callers** → new options are optional; default behavior unchanged.
- **Popup auto-submit edge cases** (empty transcript, network error) → if `initialMessage` is empty/whitespace, fall back to current behavior (open popup idle).

## Out of scope (future)

- Per-elder calibration of silence threshold.
- Optional "always-on" mode for severe motor impairment.
- Caregiver-controlled toggle to bypass confirm step for high-trust elders.
