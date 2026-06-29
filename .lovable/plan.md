
## 1. `/settings` background → `#25483A`
**File:** `src/routes/settings.index.tsx`
- Line 13: `PAGE_BG = "#8F8F8F"` → `"#25483A"`.
- Flip header text on the dark bg to white: back-button label + chevron color, and the `<h1>Settings</h1>` color → `WHITE`.
- White setting cards (and their black text) stay unchanged — they read fine on the dark green.

## 2. `/elder` V2 — green pulsing halo around mic when idle
**File:** `src/components/TalkToTextPopup.tsx`
- In the existing `<style>` block (near `ttt-big-pulse`), add:
  ```css
  @keyframes ttt-idle-pulse {
    0%   { box-shadow: 0 0 0 0   rgba(81,157,70,0.55); }
    70%  { box-shadow: 0 0 0 24px rgba(81,157,70,0); }
    100% { box-shadow: 0 0 0 0   rgba(81,157,70,0); }
  }
  ```
- Lines 941–949 (mic circle): when `v2 && recorder.status === "idle" && !sending`, set
  `animation: "ttt-idle-pulse 2s ease-out infinite"`. Recording keeps `ttt-big-pulse` (red). V1 unaffected.

## 3. `/carer` — photo upload on Elder Profile card
**File:** `src/routes/carer.index.tsx` (avatar circle, lines 270–274)
- Add `const photoInputRef = useRef<HTMLInputElement>(null);`.
- Wrap the avatar circle in its own clickable element (instead of being inside the toggle button). Restructure the profile-card header into a flex row: avatar (own click → opens file picker, `e.stopPropagation`), then a toggle button containing the name/age + chevron.
- Add a small camera-icon badge on the avatar bottom-right so the upload affordance is visible.
- Hidden `<input type="file" accept="image/*">` reuses the same `FileReader` + `<canvas>` resize-to-1024 + `toDataURL("image/jpeg", 0.8)` flow from `onboarding.tsx` (lines 612–636), then `setElder({ ...elder, avatar: dataUrl })`.

## 4. `/carer` — header restructure + larger logo
**File:** `src/routes/carer.index.tsx` (header, lines 225–261)
- Header keeps three columns: Back-button (left), **enlarged logo** center, Info + Settings (right).
- Logo: `height: 28` → `48` (`src/assets/text-logo-dark-green.png`).
- Remove the `<h1>{elder.name}'s Care Plan</h1>` and `{headerDate}` from inside `<header>`.
- The `<header>` already has `borderBottom: cardBorder` — that's our divider.
- Immediately below the header insert:
  ```tsx
  <div style={{ textAlign:"center", padding:"16px", background:panelBg }}>
    <h1 style={{ margin:0, fontFamily:"Georgia, serif", fontWeight:700, fontSize:26, color:theme.text }}>
      {elder.name}'s Care Plan
    </h1>
    <div style={{ fontSize:14, color:theme.muted, marginTop:4 }}>{headerDate}</div>
  </div>
  ```

## Defaults I'm taking unless you say otherwise
- Settings header text → white on `#25483A`.
- Mic halo → soft expanding ring, sage `#519D46`, 2s loop, idle state only.
- Carer logo bumped to `48px` height (was `28`).

## Verification
- `/settings`: dark green page, readable white header, white cards intact.
- `/elder` V2: idle mic shows a slow green ring; recording still shows red pulse; V1 unchanged.
- `/carer`: tapping the avatar opens a file picker; selected photo persists across reloads via `setElder`.
- `/carer`: header shows only logo + nav buttons above the divider; "Albert's Care Plan" + date sit centered below the divider.
