## Plan: Fix instruction-panel buttons in /elder chat

### What to change
1. **Back button** — In `src/components/TalkToTextPopup.tsx` line 802, remove the "Back" label so only the `ChevronLeft` icon remains.
2. **Button-row containment** — On the same instruction panel, add `flexWrap: "wrap"` to the button container (line 795) so the Next/Done button never overflows the panel boundaries, even at narrow chat widths.

### Why
The inline chat card in the Elder view is roughly half the viewport width. With both "Back" text and "Next" text present, the two buttons together exceed the available width of the 60 % text column inside the instruction panel, causing overflow. Removing the back label and enabling wrap keeps everything inside the panel.

### Files
- `src/components/TalkToTextPopup.tsx` (one small edit around lines 795–802)

No other UI or behavior changes.