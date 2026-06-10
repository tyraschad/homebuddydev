import { useEffect, useRef, useState } from "react";
import morningAsset from "@/assets/Morning.png.asset.json";
import goldenAsset from "@/assets/GoldenHour.png.asset.json";
import nightAsset from "@/assets/Night.png.asset.json";

export function getTimeBackgroundUrl(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 12) return morningAsset.url;
  if (h >= 15 && h < 19) return goldenAsset.url;
  return nightAsset.url;
}

type Layer = { id: number; url: string; opacity: number };

/**
 * Full-bleed time-based background. New images fade in over 10s on top of
 * the old one, which is removed once the fade completes. Re-checks every
 * 60s and on tab refocus, only updating when the URL window changes.
 */
export function TimeBackground() {
  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: 0, url: getTimeBackgroundUrl(), opacity: 1 },
  ]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const check = () => {
      const next = getTimeBackgroundUrl();
      setLayers((prev) => {
        const top = prev[prev.length - 1];
        if (top.url === next) return prev;
        const id = nextIdRef.current++;
        const newLayer: Layer = { id, url: next, opacity: 0 };
        // mount at 0 opacity then animate to 1 on next frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLayers((curr) =>
              curr.map((l) => (l.id === id ? { ...l, opacity: 1 } : l)),
            );
          });
        });
        // After fade, drop everything below the new layer
        window.setTimeout(() => {
          setLayers((curr) => curr.filter((l) => l.id >= id));
        }, 10_500);
        return [...prev, newLayer];
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

  return (
    <>
      {layers.map((l) => (
        <div
          key={l.id}
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${l.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: -1,
            pointerEvents: "none",
            opacity: l.opacity,
            transition: "opacity 10s ease-in-out",
          }}
        />
      ))}
    </>
  );
}
