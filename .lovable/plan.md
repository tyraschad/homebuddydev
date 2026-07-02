## Change

In `src/routes/elder.tsx` line 1046, replace:

```
fontFamily: v2 ? "Newsreader, serif" : "Inter, sans-serif",
```

with:

```
fontFamily: v2 ? "Newsreader, Inter, sans-serif" : "Inter, sans-serif",
```

This matches the `FONT_NEWSREADER` constant used everywhere else in the file. No other elder font changes needed — audit confirmed only Inter and Newsreader are in use.

## Verification

Grep `src/routes/elder.tsx` for `serif|Georgia|Verdana|Trebuchet` — should return only `sans-serif` fallbacks.
