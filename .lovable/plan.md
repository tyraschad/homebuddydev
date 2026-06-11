## Mic button: white icon on black circle (Elder home, V1)

In `src/routes/elder.tsx`, the mic circle currently has a white background with a black border and black icon (V1). Change to a black circle with a white icon.

### Edits

1. Line 90 — keep border same color as bg so the circle reads as solid black in V1:
   - `const micBorderColor = v2 ? "#6BA24A" : "#000000";` (no change needed; matches new bg)
2. Line 91 — icon color: white in V1
   - `const micIconColor = v2 ? "#1B5E5E" : "#FFFFFF";`
3. Line 306 — circle background: black in V1, keep white in V2
   - `background: v2 ? "#FFFFFF" : "#000000",`
4. Line 315 — the "Tap to Ask a Question" label currently uses `micIconColor`. With the change above that would turn the label white on the page background. Switch it to use the existing `cardTextBlack` token so the label stays readable (black in V1, teal in V2):
   - `color: cardTextBlack,`

### Scope

- V1 only (Accessible Visuals ON): black circle, white mic icon, label stays black.
- V2 unchanged: white circle, teal mic icon and label.
- No data/logic changes.
