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

const THEME_KEY = "strideos_theme";
const ACCENT_KEY = "strideos_accent";
const THEME_COLOR_LIGHT = "#f4f4f5";
const THEME_COLOR_DARK = "#09090b";
const DEFAULT_ACCENT: AccentId = "emerald";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
  accent: AccentId;
  setAccent: (next: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENT_OPTIONS.some((o) => o.id === value);
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const storedAccent = readStoredAccent();
    setPreferenceState(storedTheme);
    setAccentState(storedAccent);
    const next = resolvePreference(storedTheme);
    setResolved(next);
    applyResolved(next);
    applyAccent(storedAccent);
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

  const value = useMemo(
    () => ({ preference, resolved, setPreference, accent, setAccent }),
    [preference, resolved, setPreference, accent, setAccent],
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
