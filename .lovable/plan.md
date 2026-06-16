## Where it goes

`src/routes/carer.index.tsx`, inside the `CarerPortal` component's returned `<main>` — just before the `savedToast` block (~line 493), after the calendar section closes. This places it as a footer-style action at the bottom of the page content, below the calendar card.

```text
<main>
  <header />
  <section profile />
  <section instruction context />
  <section schedule + calendar />
  ── NEW: Reset setup footer row ──
  {savedToast}
  {tourOpen && <PortalTour />}
</main>
```

## What the button does

1. Confirms via `window.confirm("Reset setup? This will clear onboarding progress and return you to the start.")`.
2. Clears onboarding storage keys (matches `src/routes/onboarding.tsx`):
   - `localStorage.removeItem("homebuddy.onboarding.v2")` (in-progress draft)
   - `localStorage.removeItem("homebuddy.onboarding.completed.v1")` (completion flag)
3. Navigates to `/onboarding` using `useNavigate()` from `@tanstack/react-router`.

## Styling

Reuse the existing `btnSecondary` style already defined in `CarerPortal` (grey `#F0F0F0`, 1px `#D0D0D0` border, black text — matches the V1 carer portal styling rule in memory). Wrap in a centered container with top margin so it reads as a quiet footer action, not a primary CTA:

```tsx
<div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 40px" }}>
  <button type="button" onClick={handleResetSetup} style={btnSecondary}>
    Reset setup
  </button>
</div>
```

## Files touched

- `src/routes/carer.index.tsx` — add `useNavigate` import (already imports from `@tanstack/react-router`), add `handleResetSetup` handler in `CarerPortal`, render the footer button block before `{savedToast && …}`.

No changes to onboarding, no new dependencies, no styling token changes.