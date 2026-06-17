## Plan

### 1. Unbold the greeting

In `src/routes/elder.tsx`, change the greeting `<h1>` (line ~261) from `fontWeight: 700` to `fontWeight: 400` (or remove the bold weight) so "Good Evening, {name}" renders in regular weight. 

### 2. Replace the white horizontal PNG logo with white-logo.svg

In `src/routes/elder.tsx`, replace the `<img>` that currently uses `horizontalLogoWhite.url` (the horizontal white PNG) with the `white-logo.svg` file from `src/assets/white-logo.svg`. This applies to both V1 (`highContrast` mode) and V2 (`!highContrast` mode) since the logo sits in shared header markup above the variant branching.

### Technical notes

- `src/assets/white-logo.svg` already exists in the repo.
- Import `whiteLogo` from `@/assets/white-logo.svg` and use it as the `src` (Vite handles SVG imports as URLs in this stack).
- Adjust `height` / sizing to match the new SVG aspect ratio if needed.

No other files are expected to change.