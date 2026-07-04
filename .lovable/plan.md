
## Part A — Elder disclaimer note (V1 & V2)

In `src/components/TalkToTextPopup.tsx`, when the AI answer is produced without a matched device photo:
- Guide view (~L778): show note when `!guide.device || !guide.device.photo`.
- Non-device answer path: always show note.

Note text: *"The following instructions are based on general information. For specific guidance for your device or appliance, upload an image into the instruction context area of the carer portal."*

Style: Inter 13px, `theme.muted` text, `theme.bg` panel with 1px `#D0D0D0` border, 8px radius, 8-10px padding.

## Part B — Editable name + age (Carer)

In `src/routes/carer.index.tsx` profile header (~L322-332):
- Add pencil affordance next to name/age row.
- Clicking opens a `ModalShell` (same styling as the phone confirmation modal) with:
  - **Name** input (required, non-empty after trim)
  - **Age** number input (0-120, optional)
- Save button disabled until name is valid, follows the established disabled-then-jump pattern.
- Persist via `setElder({ ...elder, name: name.trim(), age: age ? Number(age) : undefined })`.

No schema changes — fields already exist on `ElderProfile`.

## Non-goals

- Google Calendar integration (deferred — user will send details later).
- No changes to fonts (Newsreader + Inter), color tokens, or dark-theme rules.
- No changes to reminder schema.

## Files touched

- `src/components/TalkToTextPopup.tsx` — disclaimer note
- `src/routes/carer.index.tsx` — name/age edit modal
