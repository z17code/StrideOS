"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
};

const DISMISS_KEY = "strideos_announcement_dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/announcements");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setItems(data.announcements ?? []);
        }
      } catch {
        // silent — banner is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => items.filter((a) => !dismissed.has(a.id)),
    [items, dismissed],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(next);
      return next;
    });
  }, []);

  if (!ready || visible.length === 0) return null;

  return (
    <div className="announcement-stack space-y-2 px-4 pt-3 md:px-6 lg:px-8">
      {visible.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "announcement-banner group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary-soft px-3.5 py-3 shadow-[var(--shadow-card)]",
            "animate-in-soft",
          )}
          style={{ animationDelay: `${index * 40}ms` }}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
              aria-hidden
            >
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="pressable -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-card/70 hover:text-foreground"
              aria-label="关闭公告"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
