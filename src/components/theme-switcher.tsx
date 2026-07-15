"use client";

import { cn } from "@/lib/utils";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

export function ThemeSwitcher({
  labels,
}: {
  labels: {
    appearance: string;
    system: string;
    light: string;
    dark: string;
  };
}) {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; label: string }[] = [
    { value: "system", label: labels.system },
    { value: "light", label: labels.light },
    { value: "dark", label: labels.dark },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{labels.appearance}</div>
      <div
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/50 p-1"
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
                "h-9 rounded-md text-sm font-medium touch-manipulation transition-colors active:scale-[0.98]",
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
  );
}