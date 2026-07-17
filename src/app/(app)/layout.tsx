import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { runnerProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { AppNav } from "@/components/layout/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "admin") {
    redirect("/admin");
  }

  // Onboarding gate (allow /onboarding itself)
  const profile = await db.query.runnerProfiles.findFirst({
    where: eq(runnerProfiles.userId, user.id),
  });
  const completed = Boolean(
    profile?.onboardingCompletedAt || profile?.onboardingSkippedAt,
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {completed && <AppNav />}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 safe-pt md:px-6">
          <div className="flex items-center gap-2.5 md:hidden">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
              aria-hidden
            >
              S
            </span>
            <span className="text-sm font-semibold tracking-tight">StrideOS</span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              训练驾驶舱
            </span>
            <span className="max-w-[10rem] truncate rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
              {user.username}
            </span>
          </div>
        </header>
        <main
          className={
            completed
              ? "flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-8"
              : "flex-1 px-4 py-5 md:px-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
