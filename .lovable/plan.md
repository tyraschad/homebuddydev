# Elder screen: V1 cleanup + V2 rebuild

Both variants live in `src/routes/elder.tsx`, toggled by the `highContrast` setting (`v2 = !highContrast`). Scope is limited to that file plus any tokens added in `src/styles.css`.

## 1. Add brand tokens to `src/styles.css`

Centralize the palette so future drift is impossible.

```
--color-elder-bg: #8F8F8F;
--color-elder-fg: #000000;
--color-elder-phone: #6CA24E;

--color-sage: #519D46;
--color-sage-light: #CBE894;
--color-navy: #25483A;
--color-amber: #FEE78C;
```

Also load Newsreader via `<link>` in `src/routes/__root.tsx` (Inter is already wired).

## 2. V1 Elder cleanup (high-contrast variant)

Goal: palette = {#8F8F8F bg, #000000 text/mic, #6CA24E phone}; typeface = Inter / Inter Bold only.

Changes in `elder.tsx` (V1 branches):
- Body/card text: replace `#1A1A2E` and `cardText/cardTextBlack` V1 values with `#000000`.
- Phone FAB: `fabBg` `#6BA24A` → `#6CA24E` (exact spec hex).
- Header greeting + Settings link + logo: white on grey fails contrast and isn't in palette → switch to `#000000`. Use the dark/horizontal HomeBuddy lockup instead of `white-logo.svg`.
- Remove off-palette greys: `CARD_BORDER #D0D0D0`, `COMPLETED_COLOR #6B6860`, timeline `#D0D0D0`. Use `#000000` at reduced opacity (e.g. `rgba(0,0,0,0.5)`) for completed text and `rgba(0,0,0,0.2)` for the timeline rule — keeps to the 3-color palette.
- Clock + date (`Georgia, serif`) → `Inter`, weight 700.
- `OverlayView` title (`'Trebuchet MS'`) → Inter Bold.
- `CallPopup` title (`Georgia, serif`) → Inter Bold.
- `ContactRow`, `EmergencyRow`, `CompletedRow` (`Verdana`) → Inter.
- `ReminderDetailsPopup`: `notesBg #F9F9F9` → white; border `#000000`; all text `#000000`.
- `CallPopup` emergency block: keep functional red affordance but recolor to neutral (red text on white) to stay within palette, or accept emergency-red as a documented exception — flag for user. Default plan: neutral with bold "EMERGENCY" label in `#000`.
- Strip leftover `#1A1A2E` / `#2A2A3E` references in popups (`EmergencyRow`, root `<main>` color).

## 3. V2 Elder rebuild (default variant)

Goal: Rest-of-App palette + typography. Same layout/components, retoned surfaces.

Token mapping for V2 branches:
- `pageBg`: solid `#FFFFFF` (or very soft `#CBE894` wash at 20%) — drop the `#4A7C59 → #A8D5BA` gradient.
- `cardBg`: `#FFFFFF` with `1px solid #CBE894`, radius 16, soft shadow.
- `cardText` / `cardTextBlack`: `#25483A` (Dark Navy). Removes all `#1B5E5E`.
- "Next reminder" highlight card: `#FEE78C` bg, `#519D46` border, `#25483A` text — uses Amber for the one accent moment.
- Mic circle: white fill, `2px solid #519D46`, icon `#25483A`.
- Phone FAB: `#519D46` bg, white icon (replaces `#6BA24A`/white-on-white combo).
- Reminder details popup: white card, `2px solid #519D46`, notes block `#CBE894` bg, text `#25483A`.
- Header greeting on white bg: `#25483A`; logo → horizontal HomeBuddy lockup.
- Typography:
  - Clock, date, `<h1>` greeting, `<h2>` "Today's Reminders", reminder name → `Newsreader`, weight 700.
  - Body, button labels, times, relative strings → `Inter`.
- Remove all stale V2 hexes: `#4A7C59`, `#A8D5BA`, `#1B5E5E`, `#D0E8D0`, `#E8F5E9`, `#A5D6A7`, `#6BA24A`.

## 4. Verify

- Visit `/elder` with `highContrast` on and off, screenshot both.
- Confirm contrast: V1 black-on-#8F8F8F ≈ 5.9:1 ✓; V2 #25483A-on-white ≈ 11:1 ✓.
- Grep `elder.tsx` for any remaining hex not in the two allowed palettes.

## Out of scope

- Settings page, carer portal, onboarding, popups shared with other routes (only Elder-only popups in this file change).
- No logic changes (reminder scheduling, speech, FAB behavior untouched).

## Open question

Emergency block in V1: keep red affordance (off-palette but conventional) or fully neutral? Default to neutral unless you say otherwise.
