## Plan

In the `/elder` route's inline chat (TalkToTextPopup component), conditionally render the mic button label:

- **Current behavior:** After the first user question, the mic button still shows "Tap to ask another question" text below it.
- **Desired behavior:** Once at least one user message exists in the chat, hide that label text entirely. Only the mic button itself remains visible.

### Implementation

Edit `src/components/TalkToTextPopup.tsx` around line 961 where the label text is rendered inside the inline mic button area. Wrap the text label in a conditional so it only renders when `messages` has zero user messages.

No other behavior changes — the mic button still works identically, just without the helper text after the first interaction.