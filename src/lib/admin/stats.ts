/**
 * Admin dashboard aggregates (lightweight counts for invite-only MVP).
 */
import { and, count, eq, gte, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  dailyCheckins,
  inviteCodes,
  planVersions,
  users,
} from "@/db/schema";
import { addDays, todayInShanghai } from "@/lib/datetime";

export async function getAdminDashboardStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = todayInShanghai(now);
  const weekStart = addDays(today, -6);

  const [
    [userTotals],
    [activeUsers],
    [disabledUsers],
    [adminUsers],
    [registered7d],
    [inviteTotals],
    [inviteUsed],
    [inviteExpired],
    [inviteAvailable],
    [checkinsToday],
    [activePlans],
    [activityCount],
  ] = await Promise.all([
    db.select({ n: count() }).from(users),
    db
      .select({ n: count() })
      .from(users)
      .where(eq(users.isActive, true)),
    db
      .select({ n: count() })
      .from(users)
      .where(eq(users.isActive, false)),
    db
      .select({ n: count() })
      .from(users)
      .where(eq(users.role, "admin")),
    db
      .select({ n: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ n: count() }).from(inviteCodes),
    db
      .select({ n: count() })
      .from(inviteCodes)
      .where(isNotNull(inviteCodes.usedAt)),
    db
      .select({ n: count() })
      .from(inviteCodes)
      .where(
        and(
          isNull(inviteCodes.usedAt),
          isNotNull(inviteCodes.expiresAt),
          lt(inviteCodes.expiresAt, now),
        ),
      ),
    db
      .select({ n: count() })
      .from(inviteCodes)
      .where(
        and(
          isNull(inviteCodes.usedAt),
          or(isNull(inviteCodes.expiresAt), gte(inviteCodes.expiresAt, now)),
        ),
      ),
    db
      .select({ n: sql<number>`count(distinct ${dailyCheckins.userId})` })
      .from(dailyCheckins)
      .where(eq(dailyCheckins.date, today)),
    db
      .select({ n: count() })
      .from(planVersions)
      .where(eq(planVersions.isActive, true)),
    db.select({ n: count() }).from(activities),
  ]);

  return {
    users: {
      total: Number(userTotals?.n ?? 0),
      active: Number(activeUsers?.n ?? 0),
      disabled: Number(disabledUsers?.n ?? 0),
      admins: Number(adminUsers?.n ?? 0),
      registeredLast7Days: Number(registered7d?.n ?? 0),
    },
    invites: {
      total: Number(inviteTotals?.n ?? 0),
      available: Number(inviteAvailable?.n ?? 0),
      used: Number(inviteUsed?.n ?? 0),
      expired: Number(inviteExpired?.n ?? 0),
    },
    engagement: {
      checkinUsersToday: Number(checkinsToday?.n ?? 0),
      activePlans: Number(activePlans?.n ?? 0),
      activitiesTotal: Number(activityCount?.n ?? 0),
      asOfDate: today,
      weekStartDate: weekStart,
    },
  };
}
