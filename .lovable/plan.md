## Goal
Give the carer area (`/carer`) the same animated green gradient background used in onboarding.

## What I found
- Onboarding (`src/routes/onboarding.tsx`) renders `<GradientBackground opacity={0.132} style={{ zIndex: 2 }} />` as a fixed, pointer-events-none overlay over its `theme.bg` page.
- The carer page (`src/routes/carer.index.tsx`, line 217) currently just uses `background: theme.bg` (white/grey) with no gradient.
- The `/carer` route file is only an `<Outlet />`, so the gradient should live in `carer.index.tsx` (and any future carer subroutes can be added later if needed).

## Conflict with saved memory
The active project memory says:
> Carer Portal V1 styling: page bg #8F8F8F (grey, matches Elder V1). … No beige (#F5F0E8) backgrounds.

This request explicitly overrides that. If you approve, I will also update `mem://design/carer-portal-styling` and the Core rule in `mem://index.md` so future sessions know the carer area uses the onboarding green gradient instead of flat grey.

## Changes
**`src/routes/carer.index.tsx`**
1. Import `GradientBackground` from `@/components/GradientBackground`.
2. Wrap the existing `return (<main …>…</main>)` in a fragment and append `<GradientBackground opacity={0.132} style={{ zIndex: 2 }} />` after `</main>` — exact same opacity/zIndex as onboarding so the look matches.
3. Leave `theme.bg` on `<main>` as the base color underneath the gradient (matches onboarding's setup).

No other carer markup, layout, cards, buttons, or colors change.

## Verification
- Visit `/carer` in the preview and confirm the animated green gradient appears across the full viewport, matching `/onboarding`.
- Confirm cards, headers, calendar, and buttons remain clickable (gradient is `pointer-events: none`).
- Confirm no layout shift or new scrollbars.

## Memory update (only if approved)
- Replace the grey-bg rule in `mem://design/carer-portal-styling` with: "Carer area uses the onboarding `GradientBackground` overlay (opacity 0.132, zIndex 2) over `theme.bg`. Do not revert to flat #8F8F8F."
- Update the corresponding Core line in `mem://index.md`.
