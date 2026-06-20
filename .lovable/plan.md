# Fix: chat card stops growing — mic stays put, messages scroll inside

## Root cause

The flex `minHeight: 0` chain is broken in `src/routes/elder.tsx`. The grid row is bounded, but the **left column wrapper** (line 302) and the **chat card** itself (line 303) don't pass that constraint down. Result: the card grows to fit all messages, pushing the mic off-screen, even though the inner `overflowY:auto` scroll div is correctly configured.

## Change (single file)

`src/routes/elder.tsx`:

1. Left column wrapper (line ~302): add `minHeight: 0, height: "100%"` to its style.
2. Chat card div (lines ~303–315): already has `flex: 1`, `display:flex`, `flexDirection:column`, `minHeight: 0`, `overflow: hidden` — verify it's intact (no change needed if so).

That's it. With both wrappers passing `minHeight:0`, the card is locked to the available row height, `<TalkToTextPopup inline>`'s `flex:1` scroll body shrinks to fit, and the mic (sticky `flexShrink:0` block below it) stays pinned at the bottom of the card.

## Verify

- `/elder` V2 at 819×638: send 20 messages → card height unchanged, scrollbar appears in the message area, mic button stays in same on-screen position.
- Same check on V1 (high contrast).
- Page itself does not scroll.

## Files changed

- `src/routes/elder.tsx` (one style block)
