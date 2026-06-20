## Plan: Shrink the mic button 25% in /elder inline chat

**What**
- Reduce the inline mic button circle from 200×200 px to 150×150 px (25% smaller).
- Scale the Mic icon inside proportionally (~110 px → ~82 px).
- Keep all existing colors, animations, and behaviour intact.

**Where**
- `src/components/TalkToTextPopup.tsx` — lines ~940-951 (the inline `inline` branch mic circle and icon).

**Expected result**
- The mic button takes up less vertical space, giving the scrolling chat area more room.
- Button remains centred and fully interactive.