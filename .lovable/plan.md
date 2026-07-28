Increase the outer padding on the `/elder` screen by 20% for V2 only.

**Change location:** `src/routes/elder.tsx`, `<main>` container style.

**Current code:**
```tsx
<main style={{ padding: v2 ? 16 : 18, ... }}>
```

**New code:**
```tsx
<main style={{ padding: v2 ? 19 : 18, ... }}>
```

**Math:** 16px × 1.20 = 19.2px → rounded to 19px.

**What this does:**
- V2 (accessible visuals off) gets a 20% larger outer gutter (16px → 19px).
- V1 stays at the 18px set in the previous change.
- Does not affect viewport card sizes, internal spacing, or the high-contrast V1 styles.

If you prefer a whole 20px instead of 19px, let me know and I’ll adjust.