import { useEffect, useState, type RefObject } from "react";
import { useSettings } from "@/lib/settings-store";

const GREEN = "#2F8F4E";
const TOUR_KEY = "homebuddy.tour.completed.v1";

export type TourStep = {
  ref: RefObject<HTMLElement | null>;
  title: string;
  body: string;
};

export function hasCompletedTour() {
  try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; }
}
export function markTourCompleted() {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
}
export function clearTour() {
  try { localStorage.removeItem(TOUR_KEY); } catch {}
}

export function PortalTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const { theme, cardBorder, appearance } = useSettings();
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[idx];

  useEffect(() => {
    const measure = () => {
      const el = step?.ref.current;
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setRect(el.getBoundingClientRect()), 250);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [idx, step]);

  const finish = () => { markTourCompleted(); onClose(); };
  const next = () => { if (idx >= steps.length - 1) finish(); else setIdx(idx + 1); };

  const pad = 8;
  const cutout = rect ? {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  } : null;

  // Tooltip position: prefer below the element, else above
  const tooltipWidth = Math.min(320, typeof window !== "undefined" ? window.innerWidth - 32 : 320);
  let tooltipTop = 32;
  let tooltipLeft = 16;
  if (cutout && typeof window !== "undefined") {
    const spaceBelow = window.innerHeight - (cutout.top + cutout.height);
    const below = spaceBelow > 220;
    tooltipTop = below ? cutout.top + cutout.height + 12 : Math.max(16, cutout.top - 220);
    tooltipLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, cutout.left));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "auto" }}>
      {/* Overlay using box-shadow to create cutout */}
      {cutout ? (
        <div style={{
          position: "fixed",
          top: cutout.top,
          left: cutout.left,
          width: cutout.width,
          height: cutout.height,
          borderRadius: 12,
          boxShadow: `0 0 0 9999px ${appearance === "dark" ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)"}`,
          border: `2px solid ${GREEN}`,
          pointerEvents: "none",
          transition: "all 250ms ease",
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: "fixed",
        top: tooltipTop,
        left: tooltipLeft,
        width: tooltipWidth,
        background: theme.card,
        color: theme.text,
        border: cardBorder,
        borderRadius: 8,
        padding: 16,
        fontFamily: "Verdana, sans-serif",
        lineHeight: 1.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}>
        <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          {step?.title}
        </div>
        <div style={{ fontSize: 14, color: theme.text }}>{step?.body}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 8 }}>
          <div style={{ fontSize: 12, color: theme.muted }}>Step {idx + 1} of {steps.length}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={finish} style={{
              background: "transparent", border: "none", color: theme.muted, cursor: "pointer",
              fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
            }}>Skip tour</button>
            <button type="button" onClick={next} style={{
              background: GREEN, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer",
              fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: 13,
            }}>{idx >= steps.length - 1 ? "Finish" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
