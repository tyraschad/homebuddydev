# HomeBuddy Brand Guidelines

This document is the source of truth for HomeBuddy brand colors, typography, and logo usage. It is split into two parts because the V1 Elder screen follows a separate, WCAG-driven spec from the rest of the app.

---

## 1. V1 Elder Screen (WCAG-optimized)

The Elder screen prioritizes maximum legibility and contrast for older users. Do not introduce sage green, amber, or cream tones here — keep the palette restricted.

### Colors

| Token       | Hex       | Usage                                          |
| ----------- | --------- | ---------------------------------------------- |
| Dark Grey   | `#8F8F8F` | Backgrounds                                    |
| Black       | `#000000` | Text, reminder icons, mic button background    |
| Green       | `#6CA24E` | Phone button only                              |

### Typography

| Family       | Usage                                  |
| ------------ | -------------------------------------- |
| Inter Bold   | Clock and headers                      |
| Inter        | Body text and paragraph copy           |
| Inter        | Button labels and form labels          |

---

## 2. Rest of App

Applies to onboarding, carer portal, family views, marketing, and all non-Elder surfaces.

### Colors

| Token                      | Hex       | Usage                              |
| -------------------------- | --------- | ---------------------------------- |
| Sage Green (primary)       | `#519D46` | Primary actions, brand accents     |
| Light Sage (secondary)     | `#CBE894` | Secondary surfaces, soft accents   |
| Dark Navy (text/contrast)  | `#25483A` | Primary text, high-contrast UI     |
| Amber (accent/highlights)  | `#FEE78C` | Highlights, callouts               |
| Pure White                 | `#FFFFFF` | Backgrounds, cards                 |

### Typography

| Family             | Usage                                 |
| ------------------ | ------------------------------------- |
| Newsreader         | All headers and section titles        |
| Newsreader Italic  | Subheaders and emphasized text        |
| Inter              | Body text and paragraph copy          |
| Inter              | Button labels and form labels         |

---

## 3. Logos

The HomeBuddy logos are stored as CDN-hosted assets in `src/assets/` via `.asset.json` pointer files.

| Logo              | File                                                  | Use                                      |
| ----------------- | ----------------------------------------------------- | ---------------------------------------- |
| Vertical lockup   | `src/assets/homebuddy-vertical-logo.png.asset.json`   | Stacked layouts, splash, square spaces   |
| Horizontal lockup | `src/assets/homebuddy-horizontal-logo.png.asset.json` | Headers, nav bars, wide layouts          |
| White mark        | `src/assets/white-logo.svg`                           | Use on dark backgrounds                  |

### Importing in code

```tsx
import verticalLogo from "@/assets/homebuddy-vertical-logo.png.asset.json";
import horizontalLogo from "@/assets/homebuddy-horizontal-logo.png.asset.json";

<img src={verticalLogo.url} alt="HomeBuddy" />
<img src={horizontalLogo.url} alt="HomeBuddy" />
```

The `white-logo.svg` is a regular SVG and can be imported normally:

```tsx
import whiteLogo from "@/assets/white-logo.svg";
```
