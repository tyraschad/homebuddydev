# Elder chat: scroll, auto-expire, green outlines

All changes are in `src/components/TalkToTextPopup.tsx` (the inline chat rendered inside both `/elder` V1 and V2 left column).

## 1. Scroll when chat fills the box (V1 + V2)

The scroll container already exists (`scrollRef` div at line 735 with `overflowY: "auto"`, `flex: 1`, `minHeight: 0`), and its parent in `src/routes/elder.tsx` (lines 303–318) already has `overflow: "hidden"` + `flex: 1` + `minHeight: 0`. In practice this should already scroll, but the inline wrapper renders a header/suggestions/input section above the scroll area that may push content. I will:

- Audit the inline render tree and make sure the scroll div is the only `flex: 1` child of the card with `minHeight: 0`, and that header/suggestions/input rows use `flexShrink: 0`.
- Verify in the preview at the current viewport that adding ~10 messages produces a scrollbar instead of expanding the card.

No structural rewrite — just confirming/locking the existing layout.

## 2. Auto-expire chat messages after 5 minutes (V1 + V2)

- Extend `ChatMsg` with `createdAt: number` (epoch ms). Set it everywhere a message is pushed: `pushUser`, `streamAssistant` (the assistant placeholder), and any other `setMessages([..., { role, content }])` site (lines ~282, ~406, plus any additional push sites I find on a full pass).
- Add a `useEffect` that runs a `setInterval` every 30s and filters `messages` to keep only those with `Date.now() - createdAt < 5 * 60 * 1000`. Clears interval on unmount.
- Also prune inside the existing `nowTick` 60s interval to avoid a second timer if cleaner.
- Active streaming message: do not prune while `streaming === true`, even if older than 5 min (avoids cutting an in-flight response).
- Guide/wellDone/clarify state is separate and not pruned — only the freeform chat bubbles disappear.

## 3. Bubble styling

Three palette changes in the `messages.map` render block (lines 837–859):

**V2 user bubble** (currently beige `#F0EDE5` bg + teal text):
- Background: `#6BA24A` (ACCENT green)
- Text: `#FFFFFF`
- Border: `1px solid #A8D08A` (light green outline)

**V2 AI bubble** (currently `#F0F0F0` bg + teal text):
- Keep bg + text unchanged
- Add `border: 1px solid #A8D08A` (light green outline)

**V1 (high-contrast) AI bubble** (currently no border):
- Add `border: 2px solid #6BA24A` (green outline) — matches V1's heavier 2px stroke style used elsewhere
- V1 user bubble: unchanged (keeps existing 2px black border on `#CBE894`)

Implementation: replace the inline `border: userBorder` with a computed `border` per role+variant, and set `background`/`color` from the same conditional.

## 4. Verification

- Open `/elder` (V1 via high-contrast toggle) and `/elder` V2 in preview.
- Send several messages, confirm scroll appears once content overflows.
- Confirm bubble colors/outlines match spec in both variants.
- Wait (or temporarily shorten the TTL for a manual test) and confirm old messages drop out.

## Files changed

- `src/components/TalkToTextPopup.tsx` (only file touched)

## Open question

For V2, "light green outline" — I'm planning `#A8D08A` (a soft tint of the ACCENT `#6BA24A`). Want a specific hex instead?
