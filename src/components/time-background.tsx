import { useEffect, useState } from "react";

export type TimePeriod = "morning" | "golden" | "night";

export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 15 && hour < 19) return "golden";
  return "night"; // 19-5 and 12-14 default
}

const PERIODS: Record<TimePeriod, string> = {
  morning:
    "radial-gradient(ellipse at 18% 8%, #E8DC7A 0%, #C4B85C 35%, #8FA655 100%)",
  golden:
    "radial-gradient(ellipse at 18% 8%, #F0CE6E 0%, #D4A845 35%, #8B6608 100%)",
  night:
    "radial-gradient(ellipse at 18% 8%, #46568A 0%, #2D3B5C 40%, #1A2847 100%)",
};

// Heavy grainy noise — chunky, high-alpha, tiled
const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='280'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 -0.15'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
const GRAIN_FINE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch' seed='11'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";


/**
 * Time-of-day grainy background. Renders as an absolutely positioned full-cover
 * layer; place inside a `position: relative` parent and lift siblings above
 * with `position: relative; zIndex: 1`.
 *
 * Two stacked gradient layers cross-fade over 10 seconds when the period
 * changes (checked every 60 s).
 */
export function TimeBackground() {
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
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  return (
    <>
      <style>{`@keyframes time-bg-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {/* Previous palette stays beneath while the new one fades in */}
      <div style={{ ...layer, background: PERIODS[previous] }} />
      {/* New palette fading in over 10 seconds */}
      <div
        key={fadeKey}
        style={{
          ...layer,
          background: PERIODS[current],
          animation:
            current === previous ? undefined : "time-bg-fade-in 10s ease forwards",
        }}
      />
      {/* Heavy grain texture overlay */}
      <div
        style={{
          ...layer,
          backgroundImage: GRAIN_URL,
          backgroundRepeat: "repeat",
          opacity: 0.55,
          mixBlendMode: "multiply",
        }}
      />
      {/* A second, finer grain pass for extra texture */}
      <div
        style={{
          ...layer,
          backgroundImage: GRAIN_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "120px 120px",
          opacity: 0.4,
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
}
