## Mobile audit findings (393px)

Captured screenshots at iPhone width. Issues confirmed visually:

**/settings**
- Header uses a 3-column grid (`1fr auto 1fr`) that squeezes both side buttons: `Back to elder screen` wraps to 3 lines and `Open Carer Portal` wraps to 3 lines.
- The two-up row (`Reminder Announcements` / `Text Reader`) overflows the viewport horizontally — the `Text Reader` card is clipped off the right edge.

**/elder (V2)**
- Header: `Good Morning, Albert` breaks to 3 lines and crowds the `Settings` label + gear icon in the top-right cluster.
- `Today's Reminders` card is very short on empty state (just a title + "No reminders scheduled today"), and the floating phone button (absolute-positioned inside the card at bottom-right, 56px) overlaps the empty-state text.

## Fixes

### 1) src/routes/settings.index.tsx — responsive header + stacked toggles
- Convert header grid from `1fr auto 1fr` to a mobile-friendly layout: on ≤480px, hide the "Back to elder screen" text label and show only the arrow icon (keep aria-label for a11y); shorten the right button label to `Carer Portal` on mobile (full label at ≥481px). Reduce header horizontal padding to 12 on mobile.
- Change the two-up `Reminder Announcements` / `Text Reader` row from `gridTemplateColumns: "1fr 1fr"` to a single column on ≤480px (stack vertically), keep 2 columns from 481px up.
- Implement via a small `useIsMobile()` hook already used elsewhere, or a `window.matchMedia` check with `useState + useEffect` in this file if no shared hook exists.

### 2) src/routes/elder.tsx — header + reminders card on mobile
- Header: on ≤480px shrink the greeting font size (`clamp(20px, 5vw, 32px)` or a mobile branch), and hide the "Settings" text label leaving just the gear icon button (keep aria-label). This gives the greeting enough room to render on 1–2 lines instead of 3.
- Today's Reminders card empty state: raise the card's `minHeight` on mobile so the floating phone FAB doesn't overlap the empty text. Set `minHeight: v2 ? 200 : undefined` on the card, and keep the existing `paddingBottom: v2 ? 104 : 0` on the scroll area so the FAB always clears content.

### Verification
After edits, re-run the mobile Playwright capture at 393×800 for `/elder` and `/settings`, view both screenshots, confirm:
- No horizontal overflow on /settings.
- Header buttons no longer wrap to 3 lines on either screen.
- Phone FAB does not overlap "No reminders scheduled today".

### Questions
1. On /settings mobile, prefer **(a)** icon-only Back + shortened "Carer Portal", or **(b)** keep full text and just reduce font size to fit?
2. On /elder mobile, is it OK to **hide the "Settings" text** next to the gear icon (icon-only button on mobile)?
