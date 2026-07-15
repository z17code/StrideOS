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
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-background">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/today" className="text-sm font-semibold tracking-tight">
            StrideOS
          </Link>
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-6">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[10px] touch-manipulation select-none transition-transform active:scale-95 active:opacity-70 active:bg-muted/60 rounded-md",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "stroke-[2.5]")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
