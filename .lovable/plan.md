Move the floating phone button inside the **Today’s Reminders** card on V2 only, positioned 16px from the card’s bottom-right corner.

### What will change
1. In `src/routes/elder.tsx`, add `position: "relative"` to the Today’s Reminders card container so the moved button can anchor to it.
2. Move the existing `<button className="fab-phone">` element from its fixed position at the bottom of `<main>` into the Today’s Reminders card.
3. Make the button’s positioning conditional on `v2`:
   - **V2:** `position: absolute; bottom: 16; right: 16` (inside the card).
   - **V1:** keep the existing `position: fixed; bottom: 28; right: 28` global behavior.
4. Add bottom padding to the reminders list area (`paddingBottom: v2 ? 104 : 0`) so the button never overlaps the last reminder item.

### Code preview
```tsx
{/* Today's Reminders card */}
<div
  style={{
    background: cardBg,
    border: cardBorderStyle,
    borderRadius: cardRadius,
    padding: 16,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    boxShadow: cardShadow,
    position: "relative", // anchor for the inner button
  }}
>
  <h2 ...>Today&apos;s Reminders</h2>

  <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: v2 ? 104 : 0 }}>
    {/* existing reminders list */}
  </div>

  {/* Floating Phone Button — moved inside the card */}
  <button
    type="button"
    className="fab-phone"
    onClick={() => setOverlay("call")}
    aria-label="Make a call"
    style={{
      position: v2 ? "absolute" : "fixed",
      bottom: v2 ? 16 : 28,
      right: v2 ? 16 : 28,
      width: 88,
      height: 88,
      borderRadius: "50%",
      background: fabBg,
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      zIndex: 1000,
      boxShadow: v2 ? "0 4px 8px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.2)",
      transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
    }}
    ...
  >
    <Phone size={52} strokeWidth={2} color={fabIconColor} />
  </button>
</div>
```

### Scope guardrails
- V1 layout and behavior are untouched.
- The button still opens the same call overlay.
- No changes to other cards (clock, ask-a-question) or the overall grid.