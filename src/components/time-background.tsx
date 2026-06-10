import { useEffect, useState } from "react";

export type TimePeriod = "morning" | "golden" | "night";

export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 15 && hour < 19) return "golden";
  return "night"; // 19-5 and 12-14 (noon default)
}

const PERIODS: Record<TimePeriod, { gradient: string }> = {
  morning: {
    gradient:
      "radial-gradient(ellipse at 20% 10%, #D9CC6E 0%, #C4B85C 35%, #8FA655 100%)",
  },
  golden: {
    gradient:
      "radial-gradient(ellipse at 20% 10%, #E8C56A 0%, #D4A845 40%, #8B6608 100%)",
  },
  night: {
    gradient:
      "radial-gradient(ellipse at 20% 10%, #3A4870 0%, #2D3B5C 40%, #1A2847 100%)",
  },
};

// Inline SVG fractal-noise grain overlay (no external file)
const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * Full-screen fixed grainy background that fades between time-of-day palettes.
 * - Updates every 60s; transitions opacity over 10s when the period changes.
 * - zIndex defaults to 0; place content above with position relative + zIndex 1.
 */
export function TimeBackground({ zIndex = 0 }: { zIndex?: number }) {
  const [current, setCurrent] = useState<TimePeriod>(() =>
    getTimePeriod(new Date().getHours()),
  );
  const [previous, setPrevious] = useState<TimePeriod>(current);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const tick = () => {
      const p = getTimePeriod(new Date().getHours());
      if (p !== current) {
        setPrevious(current);
        setCurrent(p);
        setFadeKey((k) => k + 1);
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [current]);


  const layer: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
  };

  return (
    <>
      <style>{`@keyframes time-bg-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {/* Previous palette (under), shown while new one fades in */}
      <div style={{ ...layer, zIndex, background: PERIODS[previous].gradient }} />
      {/* Current palette fading in over 10s */}
      <div
        key={fadeKey}
        style={{
          ...layer,
          zIndex: zIndex + 1,
          background: PERIODS[current].gradient,
          animation:
            current === previous ? undefined : "time-bg-fade-in 10s ease forwards",
        }}
      />
      {/* Grain texture overlay */}
      <div
        style={{
          ...layer,
          zIndex: zIndex + 2,
          backgroundImage: GRAIN_URL,
          backgroundRepeat: "repeat",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
}
