## 1. `/elder` — extra padding between mic icon and label (V1 + V2 inline view)

**File:** `src/components/TalkToTextPopup.tsx` (inline mic block, lines 930–979)

- Container `gap` (line 931): `16` → `20` (between mic button column and any siblings).
- Inner button `gap` between the circle and the label (line 938): `14` → `22` (≈+57% — felt right after eyeballing; 5% of 14 is only ~1px, which is invisible. Question below.)

**Question — clarify "5%":**  Are you asking for a literal 5% (≈1px), or "noticeably more breathing room"? Defaulting to a clearly visible bump (`14 → 22`) unless you say otherwise.

---

## 2. `/carer` — toast feedback after adding a phone contact

**File:** `src/routes/carer.index.tsx`

Today, `savedToast` flips on for every section save and shows a generic "Saved!" message. Tighten the contact path so the user sees a specific confirmation.

- Add `savedToastMsg` state alongside `savedToast` (line ~639).
- In `onSave` (lines 636–641), diff `next.contacts.length` against `elder.contacts.length`. If `target === "contacts"` and length increased, set message to `"Contact added"`; if a contact was edited (same length, different content), `"Contact updated"`; else fall back to current `"Saved!"`.
- The existing toast component (search for `savedToast &&` near line ~645) renders the message — swap the hardcoded label for `savedToastMsg`.

Result: closing the contact modal pops a green "Contact added" toast for 2s. No new dependency — reuses the toast already on the page.

---

## 3. `/carer` — block "Save changes" until the in-progress device form is saved

**Files:** `src/components/instruction-context-form.tsx`, `src/routes/carer.index.tsx`

The device modal's footer `Save changes` (carer.index.tsx line 1296) currently fires regardless of whether the user has a half-filled device form open inside `DeviceListEditor`. Wire dirty-state up to the parent.

**`instruction-context-form.tsx`**
- Add optional prop `onDirtyChange?: (dirty: boolean) => void`.
- Compute `dirty = !!(photo || brand.trim() || deviceType.trim() || name.trim() || questions.some(q => q.trim()) || editingId)`.
- `useEffect(() => { onDirtyChange?.(dirty); }, [dirty])`.
- Also call `onDirtyChange?.(false)` inside `reset()` (called after Save / Cancel).

**`carer.index.tsx` (EditSectionModal)**
- Add `const [deviceDraftDirty, setDeviceDraftDirty] = useState(false);`.
- Pass `onDirtyChange={setDeviceDraftDirty}` to `<DeviceListEditor>` (line 1287).
- `Save changes` button (line 1296) becomes:
  - `disabled` styling when `target === "devices" && deviceDraftDirty`: background `#9CC2A9`, cursor `not-allowed`.
  - `onClick` runs `onSubmit` normally when not blocked; when blocked, shows an inline warning instead of saving.
- Add `const [deviceBlockMsg, setDeviceBlockMsg] = useState("");`. When blocked-save is clicked, set:
  `"Finish the device above first — add at least one question, then tap **Save device** to lock it in."`
  Render the message in red below the button (mirroring `contactErr`). Clear it whenever `deviceDraftDirty` flips back to false.

This guarantees: dirty in-progress device → footer Save is visually disabled and surfaces a clear nudge; clean state → Save works as today.

---

## Verification

- `/elder` V1 & V2 inline view: extra vertical space between mic circle and "Tap to Ask a Question" label; recording / transcribing labels unchanged in styling.
- `/carer` add a phone contact → modal closes → toast reads "Contact added"; edit existing → "Contact updated"; other sections still show "Saved!".
- `/carer` Edit devices → start typing in a device form (without tapping Save device) → footer Save changes goes muted; clicking it shows the warning message and does not close the modal. After tapping Save device (or Cancel) inside the form, footer Save re-enables and works normally.
