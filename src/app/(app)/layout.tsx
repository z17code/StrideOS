import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { runnerProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { AppNav } from "@/components/layout/app-nav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { PageEnter } from "@/components/layout/page-enter";

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
    <div className="app-canvas flex min-h-dvh">
      {completed && <AppNav />}
      <div className="app-main-panel flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="app-header">
          <div className="flex items-center gap-2.5 md:hidden">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
              aria-hidden
            >
              S
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">
                StrideOS
              </span>
              <span className="block text-[11px] text-muted-foreground">
                训练驾驶舱
              </span>
            </div>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <div className="hidden items-center gap-3 md:flex">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">
                <span className="status-dot" />
                <span className="text-xs font-medium tracking-wide text-muted-foreground">
                  训练驾驶舱
                </span>
              </span>
              <span className="hidden text-[11px] text-muted-foreground/80 lg:inline">
                Asia/Shanghai
              </span>
            </div>
            <span className="max-w-[10rem] truncate rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm lg:max-w-[14rem]">
              {user.username}
            </span>
          </div>
        </header>
        {completed ? <AnnouncementBanner /> : null}
        <main
          className={
            completed
              ? "relative flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:py-7 md:pb-10 lg:px-8 xl:px-10"
              : "relative flex-1 px-4 py-5 md:px-6 md:py-7 lg:px-8 xl:px-10"
          }
        >
          <div className="app-main-inner">
            <PageEnter>{children}</PageEnter>
          </div>
        </main>
      </div>
    </div>
  );
}
