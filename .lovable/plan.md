# /elder layout + inline 2-tap voice flow

Applies to both V1 (high-contrast) and V2 (sage) variants — they share the same JSX in `src/routes/elder.tsx`, so a single restructure covers both.

## 1. Layout restructure

Current grid (2 columns, equal width):

```text
LEFT                 RIGHT
[ Clock         ]   [ Today's Reminders   ]
[ Ask Question  ]   [   (full height)     ]
[   (mic card)  ]   [                     ]
```

New grid — clock moves to top of right column unchanged, mic card spans full left-column height, reminders shorten to fit below the clock:

```text
LEFT                 RIGHT
[                ]   [ Clock (unchanged:   ]
[ Ask Question   ]   [  same size, padding,]
[ (mic + chat)   ]   [  fonts as today)    ]
[ full height    ]   [---------------------]
[                ]   [ Today's Reminders   ]
[                ]   [ (remaining height)  ]
```

Implementation: keep the existing `display: grid; gridTemplateColumns: 1fr 1fr` shell. Swap the contents of the two columns:
- **Left column**: single Ask card, `flex: 1`, fills full available height.
- **Right column**: clock card on top (**no changes** — same padding 24, same `line1Size: 38`, same `line2Size: 60`, same content), then Today's Reminders card with `flex: 1` below it, gap 16. Reminders card naturally shortens to absorb the clock's height.
- Mobile breakpoint (`@media max-width 720px`) already collapses to single column — natural stack order becomes Ask card, then clock, then reminders.

No changes to clock card sizing, clock content, reminder logic, phone FAB, settings link, header greeting.

## 2. Inline 2-tap voice + chat (replaces popup)

Per your answers: **pure 2-tap, send instantly on stop**, **live transcript above mic**, **no quick actions yet**, **conversation stays until next question**.

New states for the Ask card (replaces `idle | recording | confirming`):

```text
idle          → big mic, label "Tap to Ask a Question"
recording     → live interim transcript ABOVE mic (large), pulsing red mic,
                label below: "Tap to stop and send"
sending       → spinner + "One moment…" while transcription/LLM run
conversation  → chat transcript ABOVE mic (scrollable),
                idle mic BELOW with label "Tap to ask another question"
```

Single tap behavior:
- **idle → recording**: `startVoiceCapture()` (existing).
- **recording → sending**: `stopVoiceCapture()`, then on transcript callback skip the confirm step and immediately push the message into the chat pipeline.
- **sending → conversation**: assistant reply streams in above the mic.
- **conversation → recording**: tap mic again; new question appends to the same transcript (no auto-clear, per your answer).

### Live transcript during recording

The current `useVoiceRecorder` only returns a final transcript on stop. Two options for "live" text:
- **A. True interim results** via Web Speech API (`SpeechRecognition`) running in parallel with the recorder. Works in Chrome/Edge/Safari; gives word-by-word feedback. Adds ~40 lines and a graceful-degrade path.
- **B. Animated "Listening…" placeholder** only — no interim words, just a calm animated indicator until the final transcript lands at stop.

Recommend **A** with fallback to **B**: try `webkitSpeechRecognition`; if unavailable or it errors, show the animated "Listening…" text. Interim text renders in 28pt in a min-height 80px region directly above the mic so layout doesn't jump.

### Inline chat panel (replaces `TalkToTextPopup`)

Lift the chat state into `elder.tsx`:
- `messages: { role: 'user' | 'assistant'; content: string }[]`
- `chatStatus: 'idle' | 'sending' | 'streaming'`
- `sendMessage(text)` calls the same server function `TalkToTextPopup` uses today (extract its `handleQuery` logic into a shared hook `useElderChat` in `src/lib/use-elder-chat.ts`).

Render above the mic when `messages.length > 0`:
- Scrollable area, `flex: 1`, newest at bottom, auto-scrolls.
- User bubbles: right-aligned, sage (V2) / black border (V1) background.
- Assistant bubbles: left-aligned, no background (per chat-ui-composition guidance), 22pt body text for readability.
- No avatars, no timestamps, no copy/retry — keep it elder-simple.

Mic and label sit at the **bottom** of the card once conversation starts, slightly smaller (`micSize` 200 → 140) to leave room for chat. In pure idle (no messages yet), mic stays centered and full-size as today.

### Files

- **`src/routes/elder.tsx`**
  - Restructure the grid columns (left = Ask card full height; right = clock unchanged on top, reminders below).
  - Replace `voiceState` enum + confirm UI with `idle | recording | sending | conversation`.
  - Add `messages` state + `useElderChat` hook.
  - Remove the `overlay === "chat"` branch and the `TalkToTextPopup` render. Keep `overlay === "call"` (CallPopup) and `ReminderDetailsPopup` untouched.
  - Remove now-unused imports (`Check`, `RotateCcw`, `Square`, `TalkToTextPopup`).
- **`src/lib/use-elder-chat.ts`** (new) — extract the send/stream logic currently in `TalkToTextPopup.tsx` so the inline panel and the popup share one implementation. Returns `{ messages, status, send, reset }`.
- **`src/lib/use-voice-recorder.ts`** — add optional `onInterim?: (text: string) => void` callback wired to `webkitSpeechRecognition`. No-op when unsupported. Existing API and callers unchanged.
- **`src/components/TalkToTextPopup.tsx`** — refactor internals to consume `useElderChat` so behavior stays identical for any other consumer.

### Explicitly NOT doing

- No confirm/Redo step (you chose pure 2-tap).
- No quick action buttons (skip for now).
- No auto-clear of conversation.
- No changes to clock card (size, padding, font sizes all preserved).
- No changes to phone FAB, reminders logic, settings, announcements scheduler.
- No keyboard input — voice only on `/elder`.

### Risks / tradeoffs

- **Misheard transcripts go straight to the assistant.** Explicit tradeoff of pure 2-tap; mitigated by live interim text letting the elder mentally cross-check before stopping.
- **`webkitSpeechRecognition` unavailable in Firefox** and some embedded browsers — fallback is the "Listening…" indicator, no functionality lost.
- **Conversation can grow unbounded** since it stays until a new question. Acceptable for a single-elder home screen; chat scroll handles it. Can cap to last N turns later if needed.
