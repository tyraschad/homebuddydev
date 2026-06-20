# Fix: chat scrolls inside its card, page does not grow

## Root cause

`src/routes/elder.tsx` line 228 sets `<main>` to `minHeight: "100vh"` (no `height` cap and no `overflow: hidden`). When chat messages accumulate, the chat card grows, the grid row grows, `<main>` grows past the viewport, and the page itself scrolls instead of the inner `scrollRef` div in `TalkToTextPopup`.

The inner scroll container (`overflowY: auto`, `flex: 1`, `minHeight: 0`) is correct — it just never gets a bounded parent height to scroll against.

## Change

In `src/routes/elder.tsx`, update the `<main>` style:

- `minHeight: "100vh"` → `height: "100vh"`
- add `overflow: "hidden"`
- keep everything else as-is

That bounds the layout to the viewport, so the `flex: 1` grid row gets a fixed available height, the chat card stops growing, and the existing `overflowY: "auto"` on `scrollRef` takes over.

## Verify

- Open `/elder` (V1 and V2). Send ~15 messages.
- The chat card stays the same height; messages scroll inside it.
- The whole page does not gain a scrollbar; header + right column stay in place.

## Files changed

- `src/routes/elder.tsx` (single style block on `<main>`)

## Question

Confirm: locking `<main>` to exactly `100vh` with `overflow: hidden` is OK? On very small screens this means content below the fold gets clipped instead of page-scrolling. Given `/elder` is designed as a single-screen kiosk-style view, I think this is the intended behavior — confirm or say "allow page scroll on small screens" and I'll use a media-query fallback instead.
