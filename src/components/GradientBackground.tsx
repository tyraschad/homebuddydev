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
          {...({ bgColor1: "#000000", bgColor2: "#000000", axesHelper: "off", embedMode: "off", format: "gif", frameRate: 10, gizmoHelper: "hide", destination: "onCanvas" } as any)}
          animate="on"
          type="waterPlane"
          shader="defaults"
          color1="#519D46"
          color2="#CBE894"
          color3="#25483A"
          brightness={0.7}
          cAzimuthAngle={180}
          cDistance={2.9}
          cPolarAngle={120}
          cameraZoom={1}
          envPreset="city"
          lightType="3d"
          reflection={0.1}
          positionX={0}
          positionY={1.8}
          positionZ={0}
          rotationX={0}
          rotationY={0}
          rotationZ={-90}
          uAmplitude={0}
          uDensity={1}
          uFrequency={5.5}
          uSpeed={0.1}
          uStrength={1.9}
          uTime={0.2}
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
