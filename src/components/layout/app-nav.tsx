"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Home,
  Settings,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  isLocale,
  type Locale,
} from "@/lib/i18n/dictionaries";

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function AppNav() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, [pathname]);

  const t = getDictionary(locale);
  const navItems = [
    { href: "/today", label: t.nav.today, icon: Home },
    { href: "/plan", label: t.nav.plan, icon: CalendarDays },
    { href: "/activity", label: t.nav.activity, icon: Activity },
    { href: "/insights", label: t.nav.insights, icon: BarChart3 },
    { href: "/tools", label: t.nav.tools, icon: Wrench },
    { href: "/me", label: t.nav.me, icon: Settings },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="app-sidebar">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]"
            aria-hidden
          >
            S
          </span>
          <div className="min-w-0">
            <Link
              href="/today"
              className="block text-sm font-semibold tracking-tight"
            >
              StrideOS
            </Link>
            <p className="truncate text-[11px] text-muted-foreground">
              长跑训练系统
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3 lg:p-4">
          <p className="mb-1 px-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground/80">
            导航
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "nav-item",
                  active ? "nav-item-active" : "nav-item-idle",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-primary/15 text-primary" : "bg-muted/70 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{label}</span>
                {active && (
                  <span
                    className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-border/80 bg-muted/40 px-3 py-3">
            <p className="text-[11px] font-medium text-foreground">
              计划 · 打卡 · 洞察
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              把每一次训练，都算进目标。
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav — solid bg-card; active uses primary tint */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card safe-pb md:hidden">
        <ul className="grid grid-cols-6 px-1 pt-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] leading-tight touch-manipulation select-none transition-all active:scale-95 active:opacity-70",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                      active && "bg-primary-soft",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform",
                        active && "stroke-[2.5]",
                      )}
                    />
                  </span>
                  <span className={cn(active && "font-semibold")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
