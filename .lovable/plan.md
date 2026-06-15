## Add HomeBuddy logos to project

Upload both logo images as Lovable Assets (CDN-hosted) with pointer files committed to `src/assets/` for reference and future use.

### Files to create
- `src/assets/homebuddy-vertical-logo.png.asset.json` — vertical lockup (icon above wordmark)
- `src/assets/homebuddy-horizontal-logo.png.asset.json` — horizontal lockup (icon beside wordmark)

### How
Run `lovable-assets create` against the uploads at `/mnt/user-uploads/Vertical_Logo.png` and `/mnt/user-uploads/Horizontal_Logo.png`, writing the resulting pointer JSON into `src/assets/`. No binary files added to the repo; no components changed.

### Usage later
```tsx
import verticalLogo from "@/assets/homebuddy-vertical-logo.png.asset.json";
<img src={verticalLogo.url} alt="HomeBuddy" />
```

The existing `src/assets/white-logo.svg` stays untouched.
