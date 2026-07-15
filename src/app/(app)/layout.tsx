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
  const completed = Boolean(profile?.onboardingCompletedAt || profile?.onboardingSkippedAt);

  return (
    <div className="flex min-h-dvh">
      {completed && <AppNav />}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card px-4 safe-pt md:px-6">
          <span className="text-sm font-semibold tracking-tight md:hidden">
            StrideOS
          </span>
          <span className="ml-auto truncate text-sm text-muted-foreground">
            {user.username}
          </span>
        </header>
        <main
          className={
            completed
              ? "flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6"
              : "flex-1 px-4 py-5 md:px-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
