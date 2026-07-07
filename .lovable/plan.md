## Problem

When onboarding finishes (or is restarted), only the onboarding draft (`homebuddy.onboarding.v2`) is cleared and the elder profile is overwritten. Reminders saved in a previous session (`carer.reminders.v2` — this is where the leftover "Asprin" lived) and the legacy `carer.reminders` key are never touched, so they reappear in the carer portal after "new" setup.

Root cause: `handleFinish` and `startOver` in `src/routes/onboarding.tsx` don't reset carer-portal storage.

## Change 1 — `src/lib/carer-store.tsx`

Add a small helper so the reset logic lives in one place and stays in sync with the storage keys.

```ts
// exported alongside useCarer
const resetReminders = () => {
  try {
    localStorage.removeItem(REMINDERS_KEY);       // carer.reminders.v2
    localStorage.removeItem("carer.reminders");   // legacy
  } catch {}
  setRemindersState([]);
};
```

Expose it on the context value (same object returned by `CarerContext.Provider`) and on the `useCarer()` return type so onboarding can call it.

## Change 2 — `src/routes/onboarding.tsx`

Pull `resetReminders` from `useCarer()` and call it at both reset points:

**`handleFinish`** (after `setElder(newElder)`):
```ts
setElder(newElder);
resetReminders(); // fresh onboarding → empty carer portal
```

**`startOver`**:
```ts
const startOver = () => {
  setData({ ...DEFAULT_DATA });
  setResumePrompt(false);
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  resetReminders(); // discard anything from a prior aborted setup
};
```

Nothing else changes. Elder profile is already replaced wholesale by `setElder(newElder)` inside `handleFinish`, so contacts/conditions/notes/devices don't need a separate wipe — they're overwritten by the new onboarding values. Reminders are the only orphaned data.

## Not changing

- `resetAll()` in the store — already correct for the Settings "Reset app data" flow; unchanged.
- Onboarding draft key `homebuddy.onboarding.v2` — already cleared.
- `homebuddy.tour.completed.v1` — already cleared on finish so the tour re-runs.

## Verification

1. Preview: complete onboarding, add a reminder, restart onboarding, finish again → carer portal shows zero reminders.
2. Same flow but click "Start over" from the resume prompt → reminders cleared before setup begins.
3. Existing users mid-flow: unaffected. `resetReminders` only fires on finish or explicit start-over, never on hydrate.
