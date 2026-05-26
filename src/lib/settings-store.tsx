import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppearanceMode = "light" | "dark";
export type TextSize = "medium" | "large";

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
  appearance: AppearanceMode;
  textSize: TextSize;
  highContrast: boolean;
  announcementsEnabled: boolean;
  setAppearance: (m: AppearanceMode) => void;
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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearanceMode>("light");
  const [textSize, setTextSizeState] = useState<TextSize>("medium");
  const [highContrast, setHighContrastState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const a = localStorage.getItem("appearanceMode");
      if (a === "light" || a === "dark") setAppearanceState(a);
      const t = localStorage.getItem("textSize");
      if (t === "medium" || t === "large") setTextSizeState(t);
      const h = localStorage.getItem("highContrast");
      if (h === "true" || h === "false") setHighContrastState(h === "true");
    } catch {}
  }, []);

  const setAppearance = (m: AppearanceMode) => {
    setAppearanceState(m);
    try { localStorage.setItem("appearanceMode", m); } catch {}
  };
  const setTextSize = (s: TextSize) => {
    setTextSizeState(s);
    try { localStorage.setItem("textSize", s); } catch {}
  };
  const setHighContrast = (v: boolean) => {
    setHighContrastState(v);
    try { localStorage.setItem("highContrast", String(v)); } catch {}
  };

  const theme = appearance === "dark" ? darkTheme : lightTheme;
  const sizes = textSize === "large" ? largeSizes : mediumSizes;

  const hcStrongColor = appearance === "dark" ? "#E8E8E8" : "#1A1A2E";
  const cardBorder = highContrast ? `2.5px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;
  const buttonBorder = highContrast ? `2px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;
  const inputBorder = highContrast ? `2px solid ${hcStrongColor}` : `1.5px solid ${theme.border}`;

  return (
    <SettingsContext.Provider
      value={{
        appearance,
        textSize,
        highContrast,
        setAppearance,
        setTextSize,
        setHighContrast,
        theme,
        sizes,
        cardBorder,
        buttonBorder,
        inputBorder,
        hcStrongColor,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
