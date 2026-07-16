/**
 * Admin user list filters + read-only user summary for support.
 */
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  passwordResetTokens,
  planVersions,
  raceGoals,
  runnerProfiles,
  sessions,
  users,
} from "@/db/schema";
import { addDays, todayInShanghai } from "@/lib/datetime";

export type AdminUserStatusFilter = "all" | "active" | "disabled" | "admin";

export async function listAdminUsers(opts: {
  q?: string;
  status?: AdminUserStatusFilter;
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const conditions = [];

  const q = opts.q?.trim();
  if (q) {
    conditions.push(ilike(users.username, `%${q}%`));
  }

  const status = opts.status ?? "all";
  if (status === "active") conditions.push(eq(users.isActive, true));
  if (status === "disabled") conditions.push(eq(users.isActive, false));
  if (status === "admin") conditions.push(eq(users.role, "admin"));

  const where = conditions.length ? and(...conditions) : undefined;

  return db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      adminNote: users.adminNote,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function getAdminUserDetail(userId: string) {
  const user = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      adminNote: users.adminNote,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user) return null;

  const today = todayInShanghai();
  const weekStart = addDays(today, -6);

  const [
    profile,
    activeGoal,
    activePlan,
    [lastCheckin],
    [checkins7d],
    [activityRow],
    [sessionRow],
    [pendingReset],
  ] = await Promise.all([
    db.query.runnerProfiles.findFirst({
      where: eq(runnerProfiles.userId, userId),
    }),
    db.query.raceGoals.findFirst({
      where: and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)),
    }),
    db.query.planVersions.findFirst({
      where: and(
        eq(planVersions.userId, userId),
        eq(planVersions.isActive, true),
      ),
    }),
    db
      .select({ date: dailyCheckins.date })
      .from(dailyCheckins)
      .where(eq(dailyCheckins.userId, userId))
      .orderBy(desc(dailyCheckins.date))
      .limit(1),
    db
      .select({ n: count() })
      .from(dailyCheckins)
      .where(
        and(
          eq(dailyCheckins.userId, userId),
          gte(dailyCheckins.date, weekStart),
        ),
      ),
    db
      .select({ n: count() })
      .from(activities)
      .where(eq(activities.userId, userId)),
    db
      .select({ n: count() })
      .from(sessions)
      .where(eq(sessions.userId, userId)),
    db
      .select({ n: count() })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          sql`${passwordResetTokens.expiresAt} > now()`,
        ),
      ),
  ]);

  return {
    user,
    summary: {
      hasProfile: Boolean(profile),
      onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
      onboardingSkipped: Boolean(profile?.onboardingSkippedAt),
      activeGoal: activeGoal
        ? {
            distanceType: activeGoal.distanceType,
            raceDate: activeGoal.raceDate,
            targetTime: activeGoal.targetTime,
          }
        : null,
      activePlan: activePlan
        ? {
            id: activePlan.id,
            label: activePlan.label,
            versionNumber: activePlan.versionNumber,
            startsOn: activePlan.startsOn,
            endsOn: activePlan.endsOn,
            totalWeeks: activePlan.totalWeeks,
          }
        : null,
      lastCheckinDate: lastCheckin?.date ?? null,
      checkinsLast7Days: Number(checkins7d?.n ?? 0),
      activityCount: Number(activityRow?.n ?? 0),
      sessionCount: Number(sessionRow?.n ?? 0),
      pendingResetTokens: Number(pendingReset?.n ?? 0),
    },
  };
}
