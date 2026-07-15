"use client";

import { Button } from "@/components/ui/button";
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
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={preference === opt.value ? "default" : "outline"}
            onClick={() => setPreference(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
