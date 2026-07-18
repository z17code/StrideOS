"use client";

import { cn } from "@/lib/utils";
import {
  ACCENT_OPTIONS,
  STYLE_OPTIONS,
  useTheme,
  type AccentId,
  type StyleId,
  type ThemePreference,
} from "@/components/theme-provider";

export function ThemeSwitcher({
  labels,
  locale = "zh-CN",
}: {
  labels: {
    appearance: string;
    system: string;
    light: string;
    dark: string;
    accent: string;
    accentHint: string;
    style: string;
    styleHint: string;
  };
  locale?: "zh-CN" | "en";
}) {
  const { preference, setPreference, accent, setAccent, style, setStyle } =
    useTheme();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "system", label: labels.system },
    { value: "light", label: labels.light },
    { value: "dark", label: labels.dark },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div>
          <div className="text-sm text-muted-foreground">{labels.style}</div>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {labels.styleHint}
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label={labels.style}
        >
          {STYLE_OPTIONS.map((opt) => {
            const active = style === opt.id;
            const name = locale === "en" ? opt.labelEn : opt.labelZh;
            const hint = locale === "en" ? opt.hintEn : opt.hintZh;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStyle(opt.id as StyleId)}
                aria-pressed={active}
                className={cn(
                  "pressable rounded-2xl border px-3 py-3 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 ease-[var(--ease-out)]",
                  active
                    ? "border-primary/40 bg-primary-soft shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-foreground/15",
                )}
              >
                <span className="block text-sm font-semibold tracking-tight">
                  {name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">{labels.appearance}</div>
        <div
          className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1"
          role="group"
          aria-label={labels.appearance}
        >
          {options.map((opt) => {
            const active = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreference(opt.value)}
                className={cn(
                  "pressable h-9 rounded-xl text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-[var(--ease-out)]",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-sm text-muted-foreground">{labels.accent}</div>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {labels.accentHint}
          </p>
        </div>
        <div
          className="grid grid-cols-7 gap-2"
          role="group"
          aria-label={labels.accent}
        >
          {ACCENT_OPTIONS.map((opt) => {
            const active = accent === opt.id;
            const name = locale === "en" ? opt.labelEn : opt.labelZh;
            return (
              <button
                key={opt.id}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={active}
                onClick={() => setAccent(opt.id as AccentId)}
                className={cn(
                  "pressable relative flex aspect-square items-center justify-center rounded-full transition-transform duration-150 ease-[var(--ease-out)]",
                  "ring-offset-2 ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "scale-105 ring-2 ring-foreground" : "hover:scale-105",
                )}
              >
                <span
                  className="h-8 w-8 rounded-full border border-black/10 shadow-sm dark:border-white/15"
                  style={{ backgroundColor: opt.swatch }}
                />
                {active && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-white shadow dark:bg-zinc-950" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-medium text-foreground">
          {locale === "en"
            ? ACCENT_OPTIONS.find((o) => o.id === accent)?.labelEn
            : ACCENT_OPTIONS.find((o) => o.id === accent)?.labelZh}
        </p>
      </div>
    </div>
  );
}
