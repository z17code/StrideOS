import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/layout/logout-button";

export const dynamic = "force-dynamic";

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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
        <Link href="/admin" className="text-sm font-semibold tracking-tight">
          StrideOS Admin
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            概览
          </Link>
          <Link href="/admin/users" className="hover:text-foreground">
            用户
          </Link>
          <Link href="/admin/invites" className="hover:text-foreground">
            邀请码
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.username}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
