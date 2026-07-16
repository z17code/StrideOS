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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
        <Link href="/admin" className="shrink-0 text-sm font-semibold tracking-tight">
          StrideOS Admin
        </Link>
        <nav className="flex items-center gap-2 overflow-x-auto text-sm text-muted-foreground md:gap-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.username}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
