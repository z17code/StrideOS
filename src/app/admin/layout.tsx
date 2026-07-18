import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/layout/logout-button";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "概览" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/invites", label: "邀请码" },
  { href: "/admin/security", label: "安全" },
  { href: "/admin/announcements", label: "公告" },
  { href: "/admin/audit", label: "审计" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "admin") {
    redirect("/today");
  }

  return (
    <div className="app-canvas min-h-dvh">
      <header className="app-header">
        <Link
          href="/admin"
          className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
            aria-hidden
          >
            S
          </span>
          <span>StrideOS Admin</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm text-muted-foreground md:gap-1.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="hidden max-w-[10rem] truncate rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm sm:inline">
            {user.username}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
