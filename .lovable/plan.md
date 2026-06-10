# Elder Screen — WCAG v3 Layout Redesign

Rebuild the visual shell of `/elder` while keeping all existing behavior intact (clock, reminder announcements, TalkToText popup, phone call overlay).

## 1. Page shell

- Page background: `#8F8F8F` (replace current themed bg on this route only — settings theme stays for other screens).
- Outer padding: 16px margins around the grid.
- Layout: CSS grid, 2 equal columns (50/50) below the header. Stacks to 1 column under ~720px.

## 2. Header (full width, on gray bg)

- Left cluster: white SVG logo (use the uploaded `WhiteSVGLogo.svg`, 24px) + 12px gap + "Good {Morning|Afternoon|Evening}, {elder.name}" — white, bold Inter.
- Right cluster: "Settings" white bold Inter + 12px gap + gear icon (28px white). Wraps in `<Link to="/carer/settings">`.
- Padding: 16px left/right, 12px top/bottom.
- Add the logo file at `src/assets/white-logo.svg` (copied from upload) and import.

## 3. Left column

**Clock card** (top): white bg, existing date + time content/styling preserved (Georgia/Newsreader bold), wrapped in a new white card frame matching the new card style (1px light gray border, 4px radius, 16px padding).

**Ask a Question card** (below clock):
- White bg, 1px `#D0D0D0` border, 4px radius, 16px padding, centered content.
- 150px circular button, white bg, 2px black border, black mic icon ~80px, centered.
- Label below: "Tap to Ask a Question", 16px black bold Inter, 16px top padding.
- Click opens existing `TalkToTextPopup` (sets `overlay = "chat"`).
- Remove the old large mic button block from current layout.

## 4. Right column — Today's Reminders

White card (same border/radius/padding as above).

- Header: "Today's Reminders" 18px black bold Inter, 12px bottom padding.
- Build today's list from `reminders` filtered by repeat schedule + `oneTimeDate`, expanded per `times[]`, sorted ascending.
- Vertical 2px `#D0D0D0` timeline line on the left of the list; each row indents past it with an icon node.

Row variants:
- **Completed** (time already passed): strikethrough, `#6B6860`, 0.6 opacity, 14px Inter. Format `[icon] 8:00 AM — Aspirin`.
- **Next upcoming** (first future row): black 1px border box, 4px radius, 12px/16px padding. Bold black 16px name; second line: gray 14px `H:MM AM — in X hour/min` countdown computed from `now`.
- **Other upcoming**: black 16px Inter (not bold), gray 14px time. No border.

Icon mapping (20px, 8px gap, left of name) — reuse the existing per-type icon mapping from carer portal:
- medication → Pill, appointment → CalendarDays, activity → PersonStanding (walking), other → Circle.

Overflow handling:
- If completed rows exist and total list overflows card height, hide completed by default behind a collapsible `Completed Today (X) ▾` header (chevron toggles). Upcoming always visible.
- Card body scrolls internally if upcoming list itself exceeds a max height.

## 5. Phone button

Unchanged: 64px green circle, white phone icon 36px, fixed bottom-right 24px margins. Opens existing call overlay.

## 6. Typography & colors (this route only)

- Headers/labels on gray bg: white bold Inter.
- Card body text: black Inter; secondary/completed: `#6B6860`.
- Spec says "Headers: Bold Newsreader" but also "bold inter" — I'll use **bold Inter** for header text (matches the repeated "bold inter" lines and current font availability). The clock keeps Georgia/Newsreader as today.

## 7. Files

- Edit: `src/routes/elder.tsx` (full layout rewrite; keep announcement scheduler, overlay state, TalkToTextPopup, call overlay logic).
- Add: `src/assets/white-logo.svg` (from the uploaded `WhiteSVGLogo.svg`).
- No changes to carer store, settings, or other routes.

## Out of scope

- No changes to TalkToTextPopup internals, reminder data model, or carer screens.
- Dark/light theme toggle won't affect this route's gray background (route-scoped override). Say the word if you want it theme-aware instead.

Approve to build.