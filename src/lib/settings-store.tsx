import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export type AppearanceMode = "light" | "dark";
export type TextSize = "medium" | "large";
export type AppearanceScope = "carer" | "elder";

export const lightTheme = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1A1A2E",
  muted: "#6B6860",
  border: "#BBBBB0",
  overlay: "rgba(0,0,0,0.5)",
};

export const darkTheme = {
  bg: "#2A2A3E",
  card: "#3A3A4E",
  text: "#E8E8E8",
  muted: "#B0B0B8",
  border: "#5A5A6E",
  overlay: "rgba(0,0,0,0.7)",
};

export type Theme = typeof lightTheme;

export const mediumSizes = {
  date: 14,
  day: 56,
  time: 48,
  heading: 20,
  body: 24,
  button: 14,
};

export const largeSizes = {
  date: 16,
  day: 68,
  time: 58,
  heading: 24,
  body: 29,
  button: 16,
};

export type Sizes = typeof mediumSizes;

type Ctx = {
  // Active (scoped) appearance — switches automatically based on route
  appearance: AppearanceMode;
  setAppearance: (m: AppearanceMode) => void;
  scope: AppearanceScope;

  // Per-portal appearance — independent
  carerAppearance: AppearanceMode;
  elderAppearance: AppearanceMode;
  setCarerAppearance: (m: AppearanceMode) => void;
  setElderAppearance: (m: AppearanceMode) => void;

  textSize: TextSize;
  highContrast: boolean;
  announcementsEnabled: boolean;
  setTextSize: (s: TextSize) => void;
  setHighContrast: (v: boolean) => void;
  setAnnouncementsEnabled: (v: boolean) => void;

  theme: Theme;
  sizes: Sizes;
  cardBorder: string;
  buttonBorder: string;
  inputBorder: string;
  hcStrongColor: string;
};


const SettingsContext = createContext<Ctx | null>(null);

function scopeFromPath(pathname: string): AppearanceScope {
  if (pathname.startsWith("/carer") || pathname.startsWith("/onboarding")) return "carer";
  return "elder";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [carerAppearance, setCarerState] = useState<AppearanceMode>("light");
  const [elderAppearance, setElderState] = useState<AppearanceMode>("light");
  const [textSize, setTextSizeState] = useState<TextSize>("medium");
  const [highContrast, setHighContrastState] = useState<boolean>(true);
  const [announcementsEnabled, setAnnouncementsEnabledState] = useState<boolean>(true);

  // Track route to determine which appearance is active
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scope = scopeFromPath(pathname);

  useEffect(() => {
    try {
      const legacy = localStorage.getItem("appearanceMode");
      const e = localStorage.getItem("elderAppearanceMode") ?? legacy;
      if (e === "light" || e === "dark") setElderState(e);
      const c = localStorage.getItem("carerAppearanceMode");
      if (c === "light" || c === "dark") setCarerState(c);
      const t = localStorage.getItem("textSize");
      if (t === "medium" || t === "large") setTextSizeState(t);
      const h = localStorage.getItem("highContrast");
      if (h === "true" || h === "false") setHighContrastState(h === "true");
      const an = localStorage.getItem("announcementsEnabled");
      if (an === "true" || an === "false") setAnnouncementsEnabledState(an === "true");
    } catch {}
  }, []);

  const setCarerAppearance = (m: AppearanceMode) => {
    setCarerState(m);
    try { localStorage.setItem("carerAppearanceMode", m); } catch {}
  };
  const setElderAppearance = (m: AppearanceMode) => {
    setElderState(m);
    try {
      localStorage.setItem("elderAppearanceMode", m);
      localStorage.setItem("appearanceMode", m); // back-compat
    } catch {}
  };
  const setAppearance = (m: AppearanceMode) => {
    if (scope === "carer") setCarerAppearance(m);
    else setElderAppearance(m);
  };

  const setTextSize = (s: TextSize) => {
    setTextSizeState(s);
    try { localStorage.setItem("textSize", s); } catch {}
  };
  const setHighContrast = (v: boolean) => {
    setHighContrastState(v);
    try { localStorage.setItem("highContrast", String(v)); } catch {}
  };
  const setAnnouncementsEnabled = (v: boolean) => {
    setAnnouncementsEnabledState(v);
    try { localStorage.setItem("announcementsEnabled", String(v)); } catch {}
  };

  const appearance: AppearanceMode = scope === "carer" ? carerAppearance : elderAppearance;
  const theme = appearance === "dark" ? darkTheme : lightTheme;
  const sizes = textSize === "large" ? largeSizes : mediumSizes;

  const hcStrongColor = appearance === "dark" ? "#E8E8E8" : "#1A1A2E";
  const cardBorder = highContrast ? `2.5px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;
  const buttonBorder = highContrast ? `2px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;
  const inputBorder = highContrast ? `2px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;

  const value = useMemo<Ctx>(() => ({
    appearance,
    setAppearance,
    scope,
    carerAppearance,
    elderAppearance,
    setCarerAppearance,
    setElderAppearance,
    textSize,
    highContrast,
    announcementsEnabled,
    setTextSize,
    setHighContrast,
    setAnnouncementsEnabled,
    theme,
    sizes,
    cardBorder,
    buttonBorder,
    inputBorder,
    hcStrongColor,
  }), [appearance, scope, carerAppearance, elderAppearance, textSize, highContrast, announcementsEnabled, theme, sizes, cardBorder, buttonBorder, inputBorder, hcStrongColor]);

  return (
    <SettingsContext.Provider value={value}>
      {/* Smooth transition between light/dark */}
      <div style={{ transition: "background-color 0.3s ease, color 0.3s ease" }}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}


export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
