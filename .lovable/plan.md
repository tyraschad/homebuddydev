## Plan

1. **Delete the appearance route file**: `src/routes/settings.appearance.tsx`. The route tree will auto-regenerate.

2. **Clean up the Settings index page** (`src/routes/settings.index.tsx`): remove any link/reference to the Appearance sub-page if present (previous investigation showed there was no link, but I'll verify and strip any leftover imports or list items pointing to `/settings/appearance`).

3. **Leave theme logic intact**: `src/lib/settings-store.tsx` and the `useSettings()` hook stay untouched so existing components keep working on the default light theme. No dark-mode branching code in other components will be removed in this pass (can be a separate cleanup if you want).

### Result
- `/settings/appearance` returns 404.
- Settings page renders without an Appearance entry.
- Rest of the app unaffected.
