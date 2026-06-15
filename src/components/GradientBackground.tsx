import { useEffect, useState, type CSSProperties } from "react";

type Props = {
  opacity?: number;
  style?: CSSProperties;
};

/**
 * Fixed full-viewport ShaderGradient background.
 * Loads @shadergradient/react only on the client (it depends on three.js / WebGL).
 */
export function GradientBackground({ opacity = 1, style }: Props) {
  const [mod, setMod] = useState<typeof import("@shadergradient/react") | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@shadergradient/react").then((m) => {
      if (!cancelled) setMod(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mod) return null;
  const { ShaderGradientCanvas, ShaderGradient } = mod;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity,
        ...style,
      }}
    >
      <ShaderGradientCanvas
        style={{ width: "100%", height: "100%" }}
        pixelDensity={1}
        fov={45}
      >
        <ShaderGradient
          {...({ bgColor1: "#25483A", bgColor2: "#000000" } as any)}
          animate="on"
          type="waterPlane"
          shader="defaults"
          color1="#25483A"
          color2="#519D46"
          color3="#CBE894"
          brightness={1.2}
          cAzimuthAngle={182}
          cDistance={3.6}
          cPolarAngle={92}
          cameraZoom={1}
          envPreset="city"
          lightType="3d"
          reflection={0.1}
          positionX={-1.4}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={10}
          rotationZ={50}
          uAmplitude={1}
          uDensity={0.7}
          uFrequency={5.5}
          uSpeed={0.1}
          uStrength={1.9}
          uTime={0}
          grain="off"
          wireframe={false}
          range="disabled"
          rangeStart={0}
          rangeEnd={40}
        />
      </ShaderGradientCanvas>
    </div>
  );
}

export default GradientBackground;
