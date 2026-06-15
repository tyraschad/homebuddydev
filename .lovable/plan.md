# Add ShaderGradient background

Install `@shadergradient/react` (+ peer `three`, `@react-three/fiber`) and use the provided gradient config as a fixed background layer behind V2 elder and onboarding.

## Steps

1. **Install deps**
   - `bun add @shadergradient/react three @react-three/fiber`

2. **Create reusable component** `src/components/GradientBackground.tsx`
   - Renders `<ShaderGradientCanvas>` + `<ShaderGradient .../>` with the exact props you pasted.
   - Wrapper div: `position: fixed; inset: 0; z-index: 0; pointer-events: none;` plus an `opacity` prop (default `1`).
   - SSR-safe: dynamic import inside `useEffect` or guard with `typeof window !== "undefined"`, since `three`/`@react-three/fiber` touch `window`.

3. **Wire into V2 elder** (`src/routes/elder.tsx`, line 228 area)
   - When `v2` is true: render `<GradientBackground />` as first child of the page wrapper, set `pageBg = "transparent"`, and ensure the page root has `position: relative; zIndex: 0` so cards sit above the canvas (cards already have their own white bg, so they read correctly).
   - V1 path unchanged (keeps grey `V1_BG`).

4. **Wire into onboarding** (`src/routes/onboarding.tsx`, line 119 area)
   - Render `<GradientBackground opacity={0.12} />` behind the onboarding container.
   - Keep `theme.bg` as-is (white/dark) but make the outer wrapper transparent so the 12% gradient shows through; or layer the canvas above the bg with `opacity: 0.12`. Net effect: subtle tinted gradient wash over the existing background.

5. **Verify**
   - Check preview at `/elder` (V2 default) and `/onboarding`.
   - Confirm interactive elements still receive clicks (canvas has `pointer-events: none`).
   - Confirm V1 elder (high-contrast) still shows solid grey.

## Notes / trade-offs

- `@shadergradient/react` pulls in three.js (~150KB gzipped). Acceptable for these two screens; component is only mounted there.
- On low-end devices the WebGL canvas can be heavy. We can add a `prefers-reduced-motion` fallback to a static CSS gradient if you want — say the word and I'll include it.
- Not touching V1 elder, carer portal, or settings.
