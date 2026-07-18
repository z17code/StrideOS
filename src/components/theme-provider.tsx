"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "system" | "light" | "dark";

export type AccentId =
  | "zinc"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "violet"
  | "orange";

/** UI style skins — apple is default; more styles can be added later. */
export type StyleId = "apple" | "classic";

export const ACCENT_OPTIONS: {
  id: AccentId;
  labelZh: string;
  labelEn: string;
  /** Swatch color shown in settings (mid tone). */
  swatch: string;
}[] = [
  { id: "zinc", labelZh: "石墨", labelEn: "Graphite", swatch: "#52525b" },
  { id: "emerald", labelZh: "翠绿", labelEn: "Emerald", swatch: "#10b981" },
  { id: "sky", labelZh: "天青", labelEn: "Sky", swatch: "#0ea5e9" },
  { id: "amber", labelZh: "琥珀", labelEn: "Amber", swatch: "#f59e0b" },
  { id: "rose", labelZh: "玫红", labelEn: "Rose", swatch: "#f43f5e" },
  { id: "violet", labelZh: "紫罗兰", labelEn: "Violet", swatch: "#8b5cf6" },
  { id: "orange", labelZh: "落日", labelEn: "Sunset", swatch: "#f97316" },
];

export const STYLE_OPTIONS: {
  id: StyleId;
  labelZh: string;
  labelEn: string;
  hintZh: string;
  hintEn: string;
}[] = [
  {
    id: "apple",
    labelZh: "苹果风",
    labelEn: "Apple",
    hintZh: "玻璃质感、圆角与系统字体",
    hintEn: "Glass, soft radius, system type",
  },
  {
    id: "classic",
    labelZh: "经典",
    labelEn: "Classic",
    hintZh: "更利落的卡片与对比",
    hintEn: "Crisper cards and contrast",
  },
];

const THEME_KEY = "strideos_theme";
const ACCENT_KEY = "strideos_accent";
const STYLE_KEY = "strideos_style";
const THEME_COLOR_LIGHT = "#f4f4f5";
const THEME_COLOR_DARK = "#09090b";
const DEFAULT_ACCENT: AccentId = "emerald";
const DEFAULT_STYLE: StyleId = "apple";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
  accent: AccentId;
  setAccent: (next: AccentId) => void;
  style: StyleId;
  setStyle: (next: StyleId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENT_OPTIONS.some((o) => o.id === value);
}

export function isStyleId(value: string | null | undefined): value is StyleId {
  return STYLE_OPTIONS.some((o) => o.id === value);
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function readStoredAccent(): AccentId {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const v = window.localStorage.getItem(ACCENT_KEY);
  return isAccentId(v) ? v : DEFAULT_ACCENT;
}

function readStoredStyle(): StyleId {
  if (typeof window === "undefined") return DEFAULT_STYLE;
  const v = window.localStorage.getItem(STYLE_KEY);
  return isStyleId(v) ? v : DEFAULT_STYLE;
}

function resolvePreference(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function syncThemeColor(resolved: "light" | "dark") {
  const color = resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

function applyResolved(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  syncThemeColor(resolved);
}

function applyAccent(accent: AccentId) {
  document.documentElement.dataset.accent = accent;
}

function applyStyle(style: StyleId) {
  document.documentElement.dataset.style = style;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);
  const [style, setStyleState] = useState<StyleId>(DEFAULT_STYLE);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const storedAccent = readStoredAccent();
    const storedStyle = readStoredStyle();
    setPreferenceState(storedTheme);
    setAccentState(storedAccent);
    setStyleState(storedStyle);
    const next = resolvePreference(storedTheme);
    setResolved(next);
    applyResolved(next);
    applyAccent(storedAccent);
    applyStyle(storedStyle);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolvePreference("system");
      setResolved(next);
      applyResolved(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    window.localStorage.setItem(THEME_KEY, next);
    const resolvedNext = resolvePreference(next);
    setResolved(resolvedNext);
    applyResolved(resolvedNext);
  }, []);

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next);
    window.localStorage.setItem(ACCENT_KEY, next);
    applyAccent(next);
  }, []);

  const setStyle = useCallback((next: StyleId) => {
    setStyleState(next);
    window.localStorage.setItem(STYLE_KEY, next);
    applyStyle(next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      accent,
      setAccent,
      style,
      setStyle,
    }),
    [preference, resolved, setPreference, accent, setAccent, style, setStyle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
