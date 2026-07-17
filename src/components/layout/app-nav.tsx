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
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm"
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
              长跑训练
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            计划 · 打卡 · 洞察
          </p>
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
