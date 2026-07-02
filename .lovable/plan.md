## Confirmed

1. Short names as proposed ✓
2. Location: `continuity/design-refs/` ✓
3. Audit all 6 screens (1–5 onboarding + Carer Portal) ✓
4. Report only, no code fixes ✓

## What I'll do on Implement

### 1. Upload 15 images as CDN pointers

Run `lovable-assets create --file /mnt/user-uploads/<name>.png --filename <slug>.png` for each of the 15 uploads, writing the pointer JSON to:

```
continuity/design-refs/screens/
  01-onboarding-entry.png.asset.json
  02-onboarding-how-it-works.png.asset.json
  03-onboarding-data.png.asset.json
  04-onboarding-needs.png.asset.json
  05-onboarding-review.png.asset.json
  06-carer-portal.png.asset.json

continuity/design-refs/components/
  toggle.png.asset.json
  needs-card.png.asset.json
  back-button.png.asset.json
  mic-basic.png.asset.json
  mic-pulse.png.asset.json
  basic-button.png.asset.json
  add-content-card.png.asset.json
  calendar-bar.png.asset.json
  reminder-type-cards.png.asset.json
```

### 2. Write `continuity/design-refs/README.md`

Sections: **How to reference these** (short names → files), **Screens table**, **Components table**, **Best practice**. Each row embeds the image via its CDN URL so it renders inline when you open the doc.

### 3. Add a one-line link at the top of `continuity/brand-guidelines.md`

Points at `continuity/design-refs/README.md` so anyone landing on brand guidelines finds the visual refs.

### 4. Write `continuity/onboarding-audit.md`

Per-screen sections (Entry, How It Works, Data, Needs, Review, Carer Portal). Each finding tagged `[drift]` or `[match]`, citing the component ref where relevant. Advisory only — no code changes.

Files touched:
- create: 15 `.asset.json` pointers under `continuity/design-refs/`
- create: `continuity/design-refs/README.md`
- create: `continuity/onboarding-audit.md`
- edit: `continuity/brand-guidelines.md` (single link at top)

## How to reference later (this is the answer to your question)

**Where the reference lives:** `continuity/design-refs/README.md` — the human-readable index. Open it any time to see all short names and thumbnails.

**How you invoke a reference:** just say the short name in a sentence, e.g.
- *"Style the Next button like Basic Button"*
- *"Match the Onboarding Data layout"*
- *"Use the Mic Pulse animation on the Elder screen"*

**What I do:** open the README, resolve the short name → open the pointer file → view the image at its CDN URL → follow it in the implementation.

**Best practice on your side:**
- Reference **one thing per instruction** — cleanest signal.
- Use the **short name**, not "the third image" — names survive across sessions, uploads don't.
- To update a reference, upload a new version and say *"replace the X reference"* — I re-run the CLI and overwrite the pointer.
- If a reference is missing something (e.g. hover state), tell me in the README under that row — I read those notes.
