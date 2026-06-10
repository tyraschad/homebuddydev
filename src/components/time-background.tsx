import { useEffect, useState } from "react";
import morningAsset from "@/assets/Morning.png.asset.json";
import goldenAsset from "@/assets/GoldenHour.png.asset.json";
import nightAsset from "@/assets/Night.png.asset.json";

export function getTimeBackgroundUrl(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 12) return morningAsset.url;
  if (h >= 15 && h < 19) return goldenAsset.url;
  return nightAsset.url;
}

/**
 * Full-bleed time-based background. Crossfades between images over 10s
 * (5s fade-out + 5s fade-in via stacked layers with opacity transitions).
 * Re-checks every 60s and only updates when the URL changes.
 */
export function TimeBackground() {
  const [current, setCurrent] = useState<string>(() => getTimeBackgroundUrl());
  const [previous, setPrevious] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const check = () => {
      const next = getTimeBackgroundUrl();
      setCurrent((cur) => {
        if (next === cur) return cur;
        setPrevious(cur);
        setFading(true);
        // After full 10s transition, drop the previous layer.
        window.setTimeout(() => {
          setPrevious(null);
          setFading(false);
        }, 10000);
        return next;
      });
    };
    const id = window.setInterval(check, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const layer: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    zIndex: -1,
    pointerEvents: "none",
    transition: "opacity 10s ease-in-out",
  };

  return (
    <>
      {previous && (
        <div
          aria-hidden
          style={{
            ...layer,
            backgroundImage: `url(${previous})`,
            opacity: fading ? 0 : 1,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          ...layer,
          backgroundImage: `url(${current})`,
          opacity: 1,
        }}
      />
    </>
  );
}
