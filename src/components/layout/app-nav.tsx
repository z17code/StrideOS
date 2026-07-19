"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
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

const SIDEBAR_KEY = "strideos_sidebar_collapsed";

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === "1";
}

function applySidebarCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
}

export function AppNav() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, [pathname]);

  useEffect(() => {
    const next = readCollapsed();
    setCollapsed(next);
    applySidebarCollapsed(next);
    setReady(true);
  }, []);

  const t = getDictionary(locale);
  const navItems = [
    { href: "/today", label: t.nav.today, icon: Home },
    { href: "/plan", label: t.nav.plan, icon: CalendarDays },
    { href: "/activity", label: t.nav.activity, icon: Activity },
    { href: "/insights", label: t.nav.insights, icon: BarChart3 },
    { href: "/tools", label: t.nav.tools, icon: Wrench },
    { href: "/me", label: t.nav.me, icon: Settings },
  ];

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      applySidebarCollapsed(next);
      return next;
    });
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "app-sidebar",
          ready && collapsed && "app-sidebar-collapsed",
        )}
      >
        <div className="app-sidebar-brand flex h-[3.75rem] items-center gap-3 border-b border-border/70 px-3.5 lg:px-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-xs font-bold text-primary-foreground shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]"
            aria-hidden
          >
            S
          </span>
          <div className="app-sidebar-label min-w-0 flex-1">
            <Link
              href="/today"
              className="block text-sm font-semibold tracking-tight"
            >
              StrideOS
            </Link>
            <p className="truncate text-[11px] text-muted-foreground">
              训练驾驶舱
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "pressable h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed ? "hidden" : "hidden md:inline-flex",
            )}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
            title={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2.5 lg:p-3">
          <p className="app-sidebar-label mb-1.5 px-3 text-[10px] font-medium tracking-[0.16em] text-muted-foreground/80">
            工作区
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "nav-item",
                  active ? "nav-item-active" : "nav-item-idle",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ease-[var(--ease-out)]",
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/70 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="app-sidebar-label truncate">{label}</span>
                {active && (
                  <span
                    className="app-sidebar-label ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar-footer border-t border-border/70 p-3">
          <div className="app-sidebar-label rounded-2xl border border-border/70 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3">
            <p className="text-[11px] font-semibold tracking-tight text-foreground">
              计划 · 打卡 · 洞察
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              把每一次训练，都算进目标。
            </p>
          </div>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="pressable mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="展开侧栏"
              title="展开侧栏"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          ) : null}
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
                    "pressable flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] leading-tight select-none transition-[transform,opacity,color] duration-150 ease-[var(--ease-out)]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 ease-[var(--ease-out)]",
                      active && "bg-primary-soft",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-150 ease-[var(--ease-out)]",
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
