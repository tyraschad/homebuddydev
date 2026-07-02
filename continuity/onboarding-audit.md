# HomeBuddy Onboarding Audit
_Audited against 6 reference screenshots. Source files: `src/routes/onboarding.tsx`, `src/routes/index.tsx`, `src/routes/carer.index.tsx`, `continuity/brand-guidelines.md`, `src/styles.css`, `src/lib/settings-store.ts`._

---

## Cross-Cutting Issues (apply to all screens)

Before per-screen findings, the following systemic drifts affect every surface:

- **[drift] Body font: `Verdana` used everywhere; brand requires `Inter`.** `onboarding.tsx:121` sets `fontFamily: "Verdana, sans-serif"` on the outer `page` style; `carer.index.tsx:226` does the same. Brand guidelines (§2 Typography) specify `Inter` for all body text and form labels on non-Elder surfaces.
- **[drift] Button font: `'Trebuchet MS', sans-serif` used for all buttons; brand requires `Inter`.** `onboarding.tsx:136` (`btnPrimary`) and `onboarding.tsx:142` (`btnSecondary`) both hard-code Trebuchet MS. Carer portal `btnPrimary`/`btnSecondary` at `carer.index.tsx:193,198` use `"Inter, system-ui, sans-serif"` — the portal has been partially fixed but onboarding has not.
- **[drift] Heading font: `Georgia, serif` used for all `h1`/`h2`; brand requires `Newsreader`.** `onboarding.tsx:129,130` set `fontFamily: "Georgia, serif"`. `src/styles.css:66` defines `--font-serif: "Lora"`. Newsreader is loaded via Google Fonts in `src/routes/__root.tsx:97` but is never referenced in the onboarding component.
- **[drift] Primary green: `#2F8F4E` used in onboarding; brand Sage Green is `#519D46`.** `onboarding.tsx:19` declares `const GREEN = "#2F8F4E"`. This propagates to every green element — progress bar fill, stepper nodes, stepper connector line (`src/styles.css:177`), needs card selected border, check circle, toggle, and CTA buttons. The brand token is `#519D46` (§2 Colors).
- **[drift] Italic/subheader font should be `Newsreader Italic`; code falls back to Verdana italic.** Brand guidelines specify `Newsreader Italic` for emphasized text. The `"Don't worry"` italic line at `onboarding.tsx:303` uses `fontStyle: "italic"` on the `small` style which inherits `Verdana`.
- **[match] Newsreader is loaded.** `src/routes/__root.tsx:97` loads `Newsreader:ital,wght@0,400;0,600;0,700;1,400;1,600` from Google Fonts. The font is available in the browser; it is simply not referenced in onboarding styles.
- **[match] GradientBackground component uses correct brand tokens.** `src/components/GradientBackground.tsx:50-52` references `#519D46`, `#CBE894`, `#25483A` — the correct Sage Green, Light Sage, and Dark Navy from brand guidelines. Applied at `onboarding.tsx:543` and `carer.index.tsx:681`.

---

## Screen 1 — Onboarding Entry

_Ref: `continuity/design-refs/screens/01-onboarding-entry.png.asset.json`_

- **[match] Wordmark centered, write-on animation.** `onboarding.tsx:275` renders `<HomebuddyWordmark />` inside a flex column centered on the page. The `HomebuddyWordmark` component (`src/components/homebuddy-wordmark.tsx`) implements a clip-path write-on animation with an ink-head glow sweep — matches the reference wordmark reveal.
- **[match] Centered layout on full-viewport column.** `onboarding.tsx:274` uses `flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"` — vertically and horizontally centered, matching the design.
- **[match] Subtitle text present.** `onboarding.tsx:277` renders `"Custom care for elders at home"` and the follow-up paragraph at `onboarding.tsx:278-280`. Matches the reference subtitle.
- **[drift] Background is pure white (`#FFFFFF`), not the cream/off-white shown in the reference.** `src/lib/settings-store.ts` defines `lightTheme.bg = "#FFFFFF"`. The reference screenshot shows a warm cream background (approximately `#FEF9F0`–`#FAF7F2`). The GradientBackground overlay at `onboarding.tsx:543` is rendered at `opacity: 0.132` and `zIndex: 2` but sits outside the `<main>` element, so it does not visually tint the page background enough to reproduce the cream tone.
- **[drift] "Get Started" button is not full-width.** `onboarding.tsx:280-282`: `style={{ ...btnPrimary(), marginTop: 32, minWidth: 200 }}`. The reference shows a full-width (or near-full-width) green CTA button stretching across the content column. Code sets only `minWidth: 200`, not `width: "100%"`.
- **[drift] "Don't worry" italic line is absent from the entry screen.** The reference caption description specifies `"Don't worry" italic` copy on screen 1. In code, this line only appears on step 2 (`onboarding.tsx:303-305`). The entry screen (`data.step === 1`, `onboarding.tsx:273-284`) has no italic reassurance copy.
- **[drift] Button background green is `#2F8F4E` instead of brand `#519D46`.** `onboarding.tsx:19,133`. See cross-cutting note.
- **[drift] Button font is Trebuchet MS instead of Inter.** `onboarding.tsx:136`. See cross-cutting note.
- **[drift] Body/subtitle font is Verdana instead of Inter.** `onboarding.tsx:121`. See cross-cutting note.

---

## Screen 2 — Onboarding: How It Works

_Ref: `continuity/design-refs/screens/02-onboarding-how-it-works.png.asset.json`; component ref: `back-button.png.asset.json`, `basic-button.png.asset.json`_

- **[match] Header bar with Back button, "PROGRESS" caps label, and "1 of 4" counter.** `onboarding.tsx:158-171`: Back button renders left, "PROGRESS" label in `uppercase` + `letterSpacing: 0.5` center-right, and `{data.step - 1} of {TOTAL - 1}` = "1 of 4" at right. Layout matches reference.
- **[match] Green progress bar fills proportionally.** `onboarding.tsx:181-184`: bar width = `((data.step - 1) / (TOTAL - 1)) * 100%` with green fill and animated transition. Correct calculation for "1 of 4" = 25%.
- **[match] "How HomeBuddy Works" large heading present.** `onboarding.tsx:289`: `<h1 style={h1}>How HomeBuddy Works</h1>`. Renders in the `h1` style.
- **[match] 3-node stepper with connecting line.** `onboarding.tsx:293-302`: `<ol className="hb-stepper">` with three `<StepNode>` items (About you, Their needs, Review & launch). CSS at `src/styles.css:161-208` implements the horizontal connector line via `::before` pseudo-element and flex layout.
- **[match] "Don't worry" italic reassurance line.** `onboarding.tsx:303-305`: `<p style={{ ...small, fontStyle: "italic", marginTop: 16 }}>Don't worry — you can change any of this later.</p>`. Present and italic.
- **[drift] Back button has `borderRadius: 8`, not a pill shape.** `onboarding.tsx:139-143` defines `btnSecondary` with `borderRadius: 8`. The `back-button.png` component reference shows a full-radius pill (approximately `borderRadius: 999`). This applies to the Back button rendered at `onboarding.tsx:159-165`.
- **[drift] Back button has `background: "transparent"`, reference shows a white pill.** `onboarding.tsx:139`: `background: "transparent"`. The `back-button.png` reference shows a solid white pill with subtle border. On a white/cream page background the visual result may be indistinguishable, but the component token is wrong.
- **[drift] Back button border color is `buttonBorder` (= `"1px solid #BBBBB0"` in light mode), not a clearly visible border.** `src/lib/settings-store.ts` resolves `buttonBorder` to `1px solid ${theme.border}` which is `#BBBBB0`. The reference shows a slightly more prominent border on the white pill.
- **[drift] Progress bar height is 6px; reference appears ~8px.** `onboarding.tsx:179`: `height: 6`. Minor but visually noticeable relative to the reference.
- **[drift] Progress bar track color is `#E8E8E8` (light mode); reference may show a lighter/cream track.** `onboarding.tsx:179`: `background: appearance === "dark" ? "#3A3A4E" : "#E8E8E8"`. The reference track appears off-white/light beige on the cream background.
- **[drift] Progress bar fill and stepper nodes use `#2F8F4E` instead of brand `#519D46`.** `onboarding.tsx:183` (progress fill), `onboarding.tsx:575` (stepper node background), `src/styles.css:177` (connector line). See cross-cutting note.
- **[drift] Stepper node circle is 48×48px (`onboarding.tsx:574`); reference circles appear smaller (~36–40px).** The design reference shows compact circles relative to the card width.
- **[drift] Stepper node title font is `Georgia, serif`; brand requires `Newsreader`.** `onboarding.tsx:579`: `fontFamily: "Georgia, serif"`.
- **[drift] "Next" button font is Trebuchet MS; brand requires Inter.** `onboarding.tsx:136`. See cross-cutting note.
- **[drift] "Don't worry" italic uses Verdana (inherited); brand requires Newsreader Italic.** `onboarding.tsx:303`. See cross-cutting note.
- **[drift] Heading font is Georgia, not Newsreader.** `onboarding.tsx:129`. See cross-cutting note.

---

## Screen 3 — Onboarding: Data Collection

_Ref: `continuity/design-refs/screens/03-onboarding-data.png.asset.json`_

- **[match] Heading "Tell us about you and your loved one".** `onboarding.tsx:313`. Correct text, rendered in `h1` (serif) style.
- **[match] Two side-by-side white cards in responsive grid.** `onboarding.tsx:315-358`: `aboutGrid` uses `repeat(auto-fit, minmax(280px, 1fr))` stacking to single column on mobile. Card background `theme.card = #FFFFFF`, `border: cardBorder`, `borderRadius: 8`.
- **[match] Left card heading "Fill out information about you" with carer name field.** `onboarding.tsx:318-328`. Present.
- **[match] Right card heading "About the person you're caring for" with photo upload, name, and notes fields.** `onboarding.tsx:330-357`. Present and in correct order.
- **[match] Photo upload area: circular avatar placeholder with Camera icon + outlined "Upload photo" button.** `onboarding.tsx:596-610` (`PhotoField` component): 64×64 circle with `<Camera size={24}>` when no photo set, adjacent `<Upload size={16}>` + "Upload photo" outlined button. Matches reference structure.
- **[match] Next button is disabled (greyed) when carer name or elder name is empty.** `onboarding.tsx:359`: `navButtons(!data.carerName.trim() || !data.elderName.trim())`. Button shows `disabled` state.
- **[drift] Disabled Next button color is `#9CC2A9` (muted sage-green), not neutral grey as in reference.** `onboarding.tsx:134`: `background: disabled ? "#9CC2A9" : GREEN`. The reference shows a clearly greyed-out button (approximately `#C0C0C0` or similar neutral). `#9CC2A9` has a visible green tint and does not read as "disabled" against a white background.
- **[drift] Upload photo button font is Trebuchet MS; brand requires Inter.** `onboarding.tsx:607`.
- **[drift] Card `borderRadius: 8`; reference may show rounder cards (could be `borderRadius: 12` or higher).** `onboarding.tsx:150`.
- **[drift] Heading font is Georgia, not Newsreader.** `onboarding.tsx:129`. See cross-cutting note.
- **[drift] Body and label fonts are Verdana, not Inter.** `onboarding.tsx:121,147`. See cross-cutting note.

---

## Screen 4 — Onboarding: Needs Assessment

_Ref: `continuity/design-refs/screens/04-onboarding-needs.png.asset.json`; component ref: `needs-card.png.asset.json`_

- **[match] "Needs Assessment" heading.** `onboarding.tsx:366`. Correct text.
- **[match] 8 condition cards in a 4-column grid.** `src/styles.css:148-153`: `.hb-needs-grid { display: grid; grid-template-columns: repeat(4, 1fr); }`. `onboarding.tsx:70-73`: `ALL_CONDITIONS` contains exactly 8 entries.
- **[match] Square aspect-ratio cards.** `onboarding.tsx:382`: `aspectRatio: "1 / 1"`. Matches the reference square cards.
- **[match] Check circle positioned top-right of selected card.** `onboarding.tsx:392-399`: absolute positioned div, `top: 6, right: 6`, 22×22px circle with `<Check size={14} color="#fff">`. Matches reference placement.
- **[match] Lucide icons centered above label text.** `onboarding.tsx:389-390`: icon then `<span>` with condition name, flex column centered.
- **[drift] Selected card fill is `#E8F5E9` (pale Material Design green), not brand Light Sage `#CBE894`.** `onboarding.tsx:383`: `background: selected ? (appearance === "dark" ? "#166534" : "#E8F5E9") : theme.card`. The `needs-card.png` reference and brand guidelines both point to `#CBE894` (Light Sage) as the secondary surface color. `#E8F5E9` is a non-brand pale green.
- **[drift] Selected card border is `2px solid #2F8F4E`; brand primary green is `#519D46`.** `onboarding.tsx:384`. See cross-cutting note.
- **[drift] Check circle background is `#2F8F4E`; brand primary green is `#519D46`.** `onboarding.tsx:395`. See cross-cutting note.
- **[drift] Dark-mode selected fill is `#166534` — not a brand token.** `onboarding.tsx:383`. Not defined in brand guidelines.
- **[drift] Card font is Verdana 13px, `fontWeight: 600`; brand requires Inter.** `onboarding.tsx:386`.
- **[drift] Heading font is Georgia, not Newsreader.** `onboarding.tsx:129`. See cross-cutting note.
- **[drift] "Pick at least one" helper text is `small` style (12px, Verdana); reference shows it as a muted body note.** `onboarding.tsx:370`: uses `small` style. Minor typographic hierarchy drift.

---

## Screen 5 — Onboarding: Review

_Ref: `continuity/design-refs/screens/05-onboarding-review.png.asset.json`; component refs: `toggle.png.asset.json`_

- **[match] "{elderName}'s HomeBuddy" heading.** `onboarding.tsx:419`. Dynamically uses the entered elder name.
- **[match] Elder summary card with circular avatar, name, condition chips, and Edit button.** `onboarding.tsx:423-455`: card with 60×60 circle avatar (Camera icon fallback), elder name in Georgia bold 20px, condition chips, Edit button.
- **[match] Condition chips with border and rounded corners.** `onboarding.tsx:441-445`: `fontSize: 12, padding: "2px 8px", borderRadius: 12, background: theme.bg, border: cardBorder`. Pill-like chips.
- **[match] "Suggested ecosystem" section heading and cards.** `onboarding.tsx:506-517`: heading `h2`, then mapped recommendation cards via `suggestRecommendations()`.
- **[match] "We've also adjusted these settings" heading and 3 toggle rows.** `onboarding.tsx:520-528`: three `<ToggleRow>` for Larger text, Read-aloud, Reminders larger.
- **[match] Toggle component: green when on, grey when off, pill shape with sliding white thumb.** `onboarding.tsx:657-673`: `borderRadius: 14`, 50×28px, `background: value ? GREEN : "#888"`, white 24×24 circle thumb. Matches `toggle.png` reference structure.
- **[match] Full-width "View your portal" CTA button.** `onboarding.tsx:532`: `style={{ ...btnPrimary(), width: "100%" }}`.
- **[match] Full-width outlined "View the screen … will see" secondary button.** `onboarding.tsx:535`: `style={{ ...btnSecondary, width: "100%", height: 48 }}`.
- **[drift] Toggle "on" color is `#2F8F4E`; brand Sage Green is `#519D46`.** `onboarding.tsx:663`. See cross-cutting note.
- **[drift] Toggle "off" color is `"#888"` (mid-grey), not a defined brand token.** `onboarding.tsx:663`. While the reference shows grey-off, using an ad-hoc hex rather than a theme token means it won't adapt correctly in dark mode.
- **[drift] Edit button has `borderRadius: 8`, not a pill shape.** `onboarding.tsx:452`: `...btnSecondary` which has `borderRadius: 8`. The reference "Edit pill" implies a full-radius pill (`borderRadius: 999`).
- **[drift] "View your portal" button green is `#2F8F4E`; brand is `#519D46`.** `onboarding.tsx:19,133`. See cross-cutting note.
- **[drift] Heading font is Georgia, not Newsreader.** `onboarding.tsx:129`. See cross-cutting note.
- **[drift] "Suggested ecosystem" card section headings use `h2` style (Georgia); brand requires Newsreader.** `onboarding.tsx:507,130`.
- **[drift] Button fonts are Trebuchet MS; brand requires Inter.** `onboarding.tsx:136,142`.
- **[drift] Profile avatar circle diameter is 60px (`onboarding.tsx:427`); reference appears larger (~72–80px) relative to the card.** Minor sizing drift.

---

## Screen 6 — Carer Portal

_Ref: `continuity/design-refs/screens/06-carer-portal.png.asset.json`; component refs: `calendar-bar.png.asset.json`, `toggle.png.asset.json`, `add-content-card.png.asset.json`_

- **[match] "{elder.name}'s Care Plan" centered bold serif heading with date underneath.** `carer.index.tsx:262-266`: `<h1>` in Georgia serif 26px, centered, with `headerDate` div at 14px muted below it.
- **[match] Header 3-column grid: "View Elder Screen" left, logo center, info+settings icons right.** `carer.index.tsx:184-258`: `gridTemplateColumns: "1fr auto 1fr"` with left `justifySelf: "start"`, center logo `<img>`, right `justifySelf: "end"` with Info + Settings buttons.
- **[match] HomeBuddy dark-green logo in center of header.** `carer.index.tsx:19,235`: imports and renders `darkGreenLogo` PNG asset.
- **[match] Expandable sections: Elder Profile, Contacts, Instruction Context.** `carer.index.tsx:269-503`: three `<section>` blocks with ChevronUp/Down toggles controlling `profileOpen`, `contactsOpen`, `icOpen` state.
- **[match] Calendar bar with Day/Week/Month/List tabs + date navigator + Add Reminder button.** `carer.index.tsx:507-534`: four view-mode buttons, prev/next chevrons with label, and `<Plus>` Add Reminder button.
- **[match] Section headers use Georgia serif 20px bold.** `carer.index.tsx:368,427`: `fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 20`. Matches the styled section titles in the reference.
- **[match] Sub-section labels are Trebuchet MS, uppercase, 13px, muted.** `carer.index.tsx:694-695`. Matches the small caps labels above edit controls.
- **[match] White cards with 1px `#D0D0D0` border and subtle box-shadow.** `carer.index.tsx:201-204`: `whiteCard` style — `background: "#FFFFFF"`, `border: "1px solid #D0D0D0"`, `borderRadius: 8`, `boxShadow: "0 2px 4px rgba(0,0,0,0.1)"`. Matches reference card styling.
- **[match] Condition chips in profile section are pill-shaped.** `carer.index.tsx:344`: `borderRadius: 999`.
- **[match] GradientBackground overlay applied.** `carer.index.tsx:681`. Correct opacity/z-index pattern.
- **[drift] "View Elder Screen" button has `borderRadius: 8`, not a pill.** `carer.index.tsx:195`: `btnSecondary` with `borderRadius: 8`. Reference shows it as a full pill. The `back-button.png` component reference also shows a pill shape.
- **[drift] "Albert's Care Plan" heading font is Georgia; brand requires Newsreader for all non-Elder headers.** `carer.index.tsx:262`: `fontFamily: "Georgia, serif"`. Brand guidelines (§2 Typography) specify Newsreader.
- **[drift] Section headings (Elder Profile, Contacts, Instruction Context) use Georgia; brand requires Newsreader.** `carer.index.tsx:328,368,427`.
- **[drift] Body font is Verdana; brand requires Inter.** `carer.index.tsx:226`. See cross-cutting note.
- **[drift] Calendar tab buttons use Trebuchet MS; brand requires Inter.** `carer.index.tsx:514`: `fontFamily: "'Trebuchet MS', sans-serif"`.
- **[drift] Add Reminder button label is "Add Reminder / Medication"; reference shows "Add Reminder" (shorter label).** `carer.index.tsx:532`. The `calendar-bar.png` reference shows a concise green "Add Reminder" button without the "/ Medication" suffix.
- **[drift] Add Reminder button green is `#2F8F4E` (imported as `GREEN` from `reminder-form`); brand is `#519D46`.** `carer.index.tsx:13` imports `GREEN` from `@/components/reminder-form`. That constant resolves to `#2F8F4E`. The reference button shows the brand Sage Green.
- **[drift] Active calendar tab uses `theme.text` (black `#000000`) background; reference active tab appears as a softly tinted selection, not solid black.** `carer.index.tsx:511`: `background: view === m ? theme.text : theme.card`. The overridden `theme` at `carer.index.tsx:93` sets `text: "#000000"`, so the active tab becomes black-filled. The reference `calendar-bar.png` shows a more subtle active state (likely dark navy `#25483A` or a rounded pill highlight).
- **[drift] Page background is hard-coded `#FFFFFF` at `carer.index.tsx:93`; reference shows a very light off-white/grey page canvas behind cards.** The reference screenshot appears to have a faint grey wash (`~#F5F5F5`) on the page background outside the white cards. Code sets `bg: "#FFFFFF"` on the theme override and `panelBg = "#FFFFFF"` at `carer.index.tsx:181`, making page and card indistinguishable.
- **[drift] Photo avatar edit badge (green circle with pencil icon) at `carer.index.tsx:283-289` uses `#2F8F4E`; brand green is `#519D46`.**
