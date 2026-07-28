Increase the outer padding on the `/elder` screen by 10% for V1 only, from 16px to 18px.

**Change location:** `src/routes/elder.tsx`, `<main>` container style.

**Current code:**
```tsx
<main style={{ padding: 16, ... }}>
```

**New code:**
```tsx
<main style={{ padding: v2 ? 16 : 18, ... }}>
```

**What this does:**
- Leaves the V2 layout unchanged at 16px outer padding.
- Adds ~10% more breathing room (16px → 18px) on all four sides of the V1 screen only.
- Does not alter viewport card sizes, internal spacing, or the V2 styles.