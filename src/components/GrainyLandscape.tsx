import { useEffect, useRef } from "react";

type Palette = {
  top: [number, number, number];
  mid: [number, number, number];
  bot: [number, number, number];
};

const MORNING: Palette = { top: [212, 200, 92], mid: [168, 184, 85], bot: [122, 150, 64] };
const GOLDEN: Palette = { top: [196, 184, 69], mid: [154, 154, 53], bot: [107, 116, 32] };
const NIGHT: Palette = { top: [42, 56, 71], mid: [31, 58, 64], bot: [15, 42, 53] };

function paletteForHour(h: number): Palette {
  if (h >= 6 && h < 12) return MORNING;
  if (h >= 15 && h < 19) return GOLDEN;
  return NIGHT; // night + noon gap
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  const m = (x: [number, number, number], y: [number, number, number]) =>
    [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)] as [number, number, number];
  return { top: m(a.top, b.top), mid: m(a.mid, b.mid), bot: m(a.bot, b.bot) };
}
function rgb([r, g, b]: [number, number, number], a = 1) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

// Pre-generate a tileable noise texture once.
function makeNoiseCanvas(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 38; // ~15% alpha grain
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function GrainyLandscape() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastFrame = 0;
    const targetFps = 30;
    const frameMs = 1000 / targetFps;
    const start = performance.now();

    // Current and target palettes for smooth fade
    let current = paletteForHour(new Date().getHours());
    let from = current;
    let to = current;
    let fadeStart = 0;
    const FADE_MS = 10_000;

    const checkTime = () => {
      const p = paletteForHour(new Date().getHours());
      // Compare by reference (palettes are constants)
      if (p !== to) {
        from = current;
        to = p;
        fadeStart = performance.now();
      }
    };
    const tick = setInterval(checkTime, 60_000);

    const noise = makeNoiseCanvas(256);
    const noisePattern = ctx.createPattern(noise, "repeat");

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const CYCLE_MS = 25_000;

    const drawLayer = (pal: Palette, t: number, speed: number, opacity: number, driftPct: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const phase = ((t * speed) % CYCLE_MS) / CYCLE_MS; // 0..1
      const angle = phase * Math.PI * 2;
      const driftX = Math.sin(angle) * (w * driftPct);
      const noiseDx = Math.sin(angle * 1.7) * 4;
      const noiseDy = Math.cos(angle * 2.1) * 4;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(driftX, 0);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, rgb(pal.top));
      grad.addColorStop(0.5, rgb(pal.mid));
      grad.addColorStop(1, rgb(pal.bot));
      ctx.fillStyle = grad;
      ctx.fillRect(-w * 0.2, 0, w * 1.4, h);

      if (noisePattern) {
        ctx.save();
        ctx.translate(noiseDx, noiseDy);
        ctx.globalAlpha = opacity * 0.6;
        ctx.fillStyle = noisePattern;
        ctx.fillRect(-w * 0.2 - noiseDx, -noiseDy, w * 1.4, h);
        ctx.restore();
      }
      ctx.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < frameMs) return;
      lastFrame = now;

      // Compute palette
      if (fadeStart > 0) {
        const p = Math.min(1, (now - fadeStart) / FADE_MS);
        current = lerpPalette(from, to, p);
        if (p >= 1) {
          from = to;
          fadeStart = 0;
          current = to;
        }
      } else {
        current = to;
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const t = now - start;
      drawLayer(current, t, 1.0, 1.0, 0.1);
      drawLayer(current, t, 1.2, 0.6, 0.12);
      drawLayer(current, t, 1.5, 0.4, 0.15);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
