"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{labels.language}</div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={locale === "zh-CN" ? "default" : "outline"}
          disabled={saving}
          onClick={() => void choose("zh-CN")}
        >
          {labels.chinese}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={locale === "en" ? "default" : "outline"}
          disabled={saving}
          onClick={() => void choose("en")}
        >
          {labels.english}
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
