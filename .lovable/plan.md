All changes are scoped to `src/routes/elder.tsx`.

### 1. Reminders are already chronological — verify

`src/routes/elder.tsx` line 171-194 builds `items` by flattening every reminder's `times[]`, computing `minutes = toMinutes(t)`, then sorting:

```
list.sort((a, b) => a.minutes - b.minutes);
```

`upcomingItems` (line 221) and `completedItems` (line 220) are derived via `.filter()` on the already-sorted list, so both lists render in time order. No change needed — I'll just confirm this is correct when implementing.

### 2. V1 logo → white version

`src/routes/elder.tsx` line 253:
```tsx
<img src={v2 ? horizontalLogoWhite.url : horizontalLogo.url} ... />
```
Change to always use the white asset:
```tsx
<img src={horizontalLogoWhite.url} ... />
```

### 3. Contact rows: hover = black text on white background

In the "Make a Call" popup, `ContactRow` (lines 909-944) and `EmergencyRow` (lines 946-974) currently set hover background to `#F5F5F5` and keep name/phone in `theme.text` / `theme.muted`. In V1 dark theme this renders light text on light grey — unreadable.

Update both rows so hover swaps:
- background → `#FFFFFF`
- name text → `#000000`
- phone text → `#000000`

Implementation: track a local `hover` state (or use `onMouseEnter/Leave` to toggle inline styles on the row plus child name/phone divs by giving them refs / class). Simplest: add `useState` for hover in each row and conditionally compute `background`, name `color`, and phone `color`. Default (non-hover) styling stays exactly as it is today.

`EmergencyRow` gets the same treatment for consistency (it already uses black text, but its phone color `#4A4A4A` should go pure black on hover so the spec applies uniformly).

### Verification

After edits I'll open `/elder` in the preview, toggle V1 (high-contrast on), open the phone FAB, and hover a personal contact and an emergency contact to confirm: white bg, black name, black phone. I'll also eyeball the reminders list order against the seeded times.
