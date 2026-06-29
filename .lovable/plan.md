## Goal
Split the single "Elder Profile" white card on `/carer` into two separate white cards so info groups read clearly:

1. **Card 1 – Elder:** avatar/name/age header + Health conditions + Notes
2. **Card 2 – Contacts:** Phone contacts + pre-added Emergency (911 / Poison Control)

All other sections (Instruction Context, Schedule controls, Calendar) stay exactly as they are.

## What I found
`src/routes/carer.index.tsx` currently puts conditions, notes, phone contacts, AND emergency inside ONE `<section style={whiteCard}>` (lines 260–338), gated by `profileOpen`. `whiteCard` (line 196) is already `background: "#FFFFFF"` — so the "white background" requirement is satisfied by reusing `whiteCard` for the new section.

## Changes (single file: `src/routes/carer.index.tsx`)

**1. Add a new collapsible state (near line 121 where `profileOpen` is declared):**
```tsx
const [contactsOpen, setContactsOpen] = useState(true);
```

**2. Add a ref for the tour (near `profileRef`):**
```tsx
const contactsRef = useRef<HTMLElement>(null);
```

**3. Lines 260–338 — split the one `<section>` into two:**

- **Card 1** keeps the avatar/name header + `Health conditions` SubSection + `Notes` SubSection. Remove the Phone contacts SubSection from this card.
- **Card 2** (new `<section ref={contactsRef} style={whiteCard}>`): a header button styled like the elder header but with a "Contacts" title (and chevron toggle bound to `contactsOpen`), then the existing `Phone contacts` SubSection block + Emergency sub-block — moved verbatim from lines 300–335.

**4. Update the tour step copy (line 210):** change Elder Profile body to mention only conditions + notes, and add a new tour step right after it pointing at `contactsRef`:
```tsx
{ ref: contactsRef, title: "Contacts", body: "Add phone contacts so " + elder.name + " can reach the people who matter. 911 and Poison Control are always available." },
```

No styling, color, or behavior changes beyond the split. Both cards use the existing `whiteCard` style (white #FFFFFF, 1px #D0D0D0 border, 8px radius, subtle shadow) so they sit cleanly on the green gradient.

## Question
The new Contacts card needs a header to toggle open/closed. Two options — which do you prefer?
- **A. Simple text header:** "Contacts" title + chevron, no icon. Compact.
- **B. Icon + title:** small phone icon in a circle (matching the elder avatar circle style) + "Contacts" + chevron. Visually consistent with Card 1.

If you don't reply, I'll go with **A (simple)** since contacts don't have an avatar.

## Verification
- `/carer` shows two stacked white cards where the Elder Profile card used to be.
- Card 1 collapses/expands conditions + notes independently.
- Card 2 collapses/expands phone contacts + emergency independently.
- Emergency 911 / Poison Control still render read-only inside Card 2.
- Tour walks through both cards in order.
- Instruction Context, Schedule, and Calendar are visually unchanged.
