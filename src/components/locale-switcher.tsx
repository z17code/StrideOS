"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/dictionaries";

export function LocaleSwitcher({
  initialLocale,
  labels,
}: {
  initialLocale: Locale;
  labels: { language: string; chinese: string; english: string; saved: string };
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(next: Locale) {
    if (next === locale || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/me/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) throw new Error("failed");
      setLocale(next);
      setMessage(labels.saved);
      window.location.reload();
    } catch {
      setMessage("Failed");
    } finally {
      setSaving(false);
    }
  }

  const options: { value: Locale; label: string }[] = [
    { value: "zh-CN", label: labels.chinese },
    { value: "en", label: labels.english },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{labels.language}</div>
      <div
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1"
        role="group"
        aria-label={labels.language}
      >
        {options.map((opt) => {
          const active = locale === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => void choose(opt.value)}
              className={cn(
                "h-9 rounded-md text-sm font-medium touch-manipulation transition-colors active:scale-[0.98] disabled:opacity-50",
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
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}