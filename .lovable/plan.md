Update the V1 user chat bubble background color in the Elder chat popup.

## What
Change the background of user-sent message bubbles in V1 (not V2) from the current green (`#6BA24A`) to the lighter green `#CBE894`.

## Where
`src/components/TalkToTextPopup.tsx`, line 772 inside the `messages.map` render.

## How
Change:
```
const userBg = v2 ? BEIGE : ACCENT;
```
to:
```
const userBg = v2 ? BEIGE : "#CBE894";
```

This only affects the user bubble background in V1. The black 2px border and black text from the previous update remain unchanged. AI/carer bubbles and all other `ACCENT` usages (buttons, icons, borders) are left as-is.

## Verify
Open the Elder V1 chat and send a message to confirm the bubble background is `#CBE894`.