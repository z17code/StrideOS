import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { runnerProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "admin") {
    redirect("/admin");
  }

  const profile = await db.query.runnerProfiles.findFirst({
    where: eq(runnerProfiles.userId, user.id),
  });
  if (!profile?.onboardingCompletedAt && !profile?.onboardingSkippedAt) {
    redirect("/onboarding");
  }
  redirect("/today");
}
