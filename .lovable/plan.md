## Where this lives

All changes are in `src/components/TalkToTextPopup.tsx` — the chat popup used on `/elder`. The "Well Done!" screen is rendered at lines 748–769, shown when `wellDone` state is set by `finishGuide()` (line 610). The popup already has a `v2` flag and existing `playTTS()` / `stopTTS()` helpers, so we reuse them.

---

## 1. Speak "Well Done! You completed your task" (V1 + V2)

In `finishGuide` (around line 610), after `setWellDone(label)`, call the existing `playTTS` helper. Runs in both versions.

```tsx
const finishGuide = () => {
  stopTTS();
  const label = guide?.label ?? "";
  setGuide(null);
  setWellDone(label);

  playDing();                                       // see #2
  void playTTS("Well Done! You completed your task"); // exact wording you asked for
};
```

---

## 2. Soft positive ding sound (V1 + V2)

No audio file needed — synthesize a short two-note chime with WebAudio so it ships with zero new assets. Add this helper near the other helpers in the component:

```tsx
const playDing = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // Two soft sine tones: C6 then E6 — gentle "ding-ding"
    [
      { f: 1046.5, t: now },
      { f: 1318.5, t: now + 0.12 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);      // soft attack
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); // gentle decay
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // ignore — audio is non-essential
  }
};
```

Wrapped in `try/catch` because some browsers block audio without a user gesture; the "Done" tap that calls `finishGuide` counts as a gesture, so it will play.

---

## 3. iOS-style pop animation on the completion card (V2 only)

Your CSS is good — keyframes overshoot to 1.035 then settle at 1.0, exactly the iOS "confirm" feel. Two small notes on the snippet you sent:

- `.complete-button` is a misleading class name (it's the card, not a button). I'll rename it to `.ttt-complete-pop` to match the popup's naming.
- The popup already has an inline `<style>` block (line 624+) where `@keyframes ttt-pulse` lives — I'll add your keyframes there so they stay scoped to this component instead of leaking to global CSS.

Inside the existing `<style>{` ... `}</style>` block:

```css
@keyframes iosConfirmPop {
  0%   { opacity: 0; transform: scale(0.92); }
  45%  { opacity: 1; transform: scale(1.035); }
  70%  {              transform: scale(1.012); }
  100% { opacity: 1; transform: scale(1); }
}
.ttt-complete-pop {
  animation: iosConfirmPop 450ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
  will-change: transform, opacity;
}
```

Then on the completion card (line 749), apply the class only in V2 so V1's look is unchanged:

```tsx
<div
  className={v2 ? "ttt-complete-pop" : undefined}
  style={{ background: "#FFFFFF", border: v2 ? "1px solid #E5E5E5" : "2px solid #000000", /* …unchanged… */ }}
>
  <div style={{ fontSize: 56, lineHeight: 1, color: ACCENT, fontWeight: 900 }}>✓</div>
  <div /* Well Done! */>Well Done!</div>
  ...
</div>
```

The green check mark stays where it is; the whole card (check + text + button) pops in together as one cohesive iOS-style confirmation.

---

## Summary of edits (one file)

`src/components/TalkToTextPopup.tsx`:
1. Add `playDing()` helper.
2. In `finishGuide`, after `setWellDone(label)`: call `playDing()` and `playTTS("Well Done! You completed your task")` — both V1 and V2.
3. Add `@keyframes iosConfirmPop` + `.ttt-complete-pop` to the existing inline `<style>` block.
4. Add `className={v2 ? "ttt-complete-pop" : undefined}` to the completion card div (V2 only).

No new files, no new deps.