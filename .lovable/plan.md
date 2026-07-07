# Remove hardcoded "Aspirin" from reminder form

## Finding

There is no hardcoded Aspirin reminder anywhere in stored data or seed lists (`defaultReminders` is `[]`). The word "Aspirin" only appears twice, in the input placeholder text of the reminder form:

`src/components/reminder-form.tsx:110` and `:113`

```ts
const namePlaceholder = r.type === "medication" ? "e.g., Aspirin, Eye drops, Insulin"
  : r.type === "appointment" ? "e.g., Doctor appointment, Dentist"
  : r.type === "activity" ? "e.g., Morning walk, Call Sarah"
  : "e.g., Aspirin, Eye drops, Doctor appointment";
```

## Change

Replace both placeholder strings so "Aspirin" no longer appears, keeping the other examples intact:

```ts
const namePlaceholder = r.type === "medication" ? "e.g., Eye drops, Insulin"
  : r.type === "appointment" ? "e.g., Doctor appointment, Dentist"
  : r.type === "activity" ? "e.g., Morning walk, Call Sarah"
  : "e.g., Eye drops, Doctor appointment";
```

No other files touched. No data/store changes.
