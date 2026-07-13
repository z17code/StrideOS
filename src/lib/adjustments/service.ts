import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  adjustmentProposals,
  dailyCheckins,
  planVersions,
  planWorkouts,
  type AdjustmentProposal,
} from "@/db/schema";
import { todayInShanghai, addDays, dayOfWeek } from "@/lib/datetime";
import {
  proposeAdjustments,
  applyProposalToWorkouts,
  type PlannedWorkoutRef,
  type AdjustmentProposal as Proposal,
} from "./engine";
import { getActivePlan } from "@/lib/plans/service";

export function mapProposal(p: AdjustmentProposal) {
  return {
    id: p.id,
    planVersionFrom: p.planVersionFrom,
    planVersionTo: p.planVersionTo,
    changesSnapshot: p.changesSnapshot,
    reason: p.reason,
    status: p.status,
    createdAt: p.createdAt,
    confirmedAt: p.confirmedAt,
  };
}

export async function listProposals(userId: string) {
  return db
    .select()
    .from(adjustmentProposals)
    .where(eq(adjustmentProposals.userId, userId))
    .orderBy(desc(adjustmentProposals.createdAt));
}

export async function getProposal(userId: string, proposalId: string) {
  return db.query.adjustmentProposals.findFirst({
    where: and(
      eq(adjustmentProposals.id, proposalId),
      eq(adjustmentProposals.userId, userId),
    ),
  });
}

export async function getPendingProposals(userId: string) {
  return db
    .select()
    .from(adjustmentProposals)
    .where(
      and(
        eq(adjustmentProposals.userId, userId),
        eq(adjustmentProposals.status, "pending"),
      ),
    )
    .orderBy(desc(adjustmentProposals.createdAt));
}

export async function proposeAdjustment(
  userId: string,
  reason: string,
  today: string = todayInShanghai(),
) {
  const plan = await getActivePlan(userId);
  if (!plan) {
    return { error: "NO_ACTIVE_PLAN" as const, message: "当前没有活跃计划" };
  }

  const lookback = addDays(today, -14);
  const [acts, checks] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          gte(activities.date, lookback),
          lte(activities.date, today),
        ),
      ),
    db
      .select()
      .from(dailyCheckins)
      .where(
        and(
          eq(dailyCheckins.userId, userId),
          gte(dailyCheckins.date, lookback),
          lte(dailyCheckins.date, today),
        ),
      ),
  ]);

  const workoutRefs: PlannedWorkoutRef[] = plan.workouts.map((w) => ({
    id: w.id,
    scheduledDate: w.scheduledDate,
    workoutType: w.workoutType,
    distanceKm: w.distanceKm,
    durationMin: w.durationMin,
    targetRpe: w.targetRpe,
    targetPaceMinKm: w.targetPaceMinKm,
    targetPaceMaxKm: w.targetPaceMaxKm,
    isQuality: w.isQuality,
    dayOfWeek: w.dayOfWeek,
    weekNumber: w.weekNumber,
  }));

  const { proposals, warnings } = proposeAdjustments({
    userId,
    planVersionId: plan.version.id,
    workouts: workoutRefs,
    activities: acts.map((a) => ({
      date: a.date,
      workoutType: a.workoutType,
      distanceKm: a.distanceKm,
      durationMin: a.durationMin,
      actualRpe: a.actualRpe,
      painLevel: a.painLevel,
      notes: a.notes,
    })),
    checkins: checks.map((c) => ({
      date: c.date,
      fatigueLevel: c.fatigueLevel,
      painLevel: c.painLevel,
    })),
    today,
  });

  if (proposals.length === 0) {
    return {
      error: "NO_ADJUSTMENT_NEEDED" as const,
      message: "当前无需调整",
      warnings,
    };
  }

  const [created] = await db
    .insert(adjustmentProposals)
    .values({
      userId,
      planVersionFrom: plan.version.id,
      planVersionTo: null,
      changesSnapshot: {
        proposals,
        warnings,
        sourcePlanVersionId: plan.version.id,
        sourceVersionNumber: plan.version.versionNumber,
      },
      reason,
      status: "pending",
    })
    .returning();

  return { proposal: created, proposals, warnings };
}

export async function confirmProposal(userId: string, proposalId: string) {
  const proposal = await getProposal(userId, proposalId);
  if (!proposal) return { error: "NOT_FOUND" as const, message: "提案不存在" };
  if (proposal.status !== "pending")
    return { error: "NOT_PENDING" as const, message: "提案已处理" };

  const snapshot = proposal.changesSnapshot as { proposals: Proposal[] };
  const sourceVersion = await db.query.planVersions.findFirst({
    where: and(
      eq(planVersions.id, proposal.planVersionFrom),
      eq(planVersions.userId, userId),
    ),
  });
  if (!sourceVersion)
    return { error: "SOURCE_PLAN_GONE" as const, message: "源计划已不存在" };

  const sourceWorkouts = await db
    .select()
    .from(planWorkouts)
    .where(eq(planWorkouts.planVersionId, sourceVersion.id));

  const workoutRefs: PlannedWorkoutRef[] = sourceWorkouts.map((w) => ({
    id: w.id,
    scheduledDate: w.scheduledDate,
    workoutType: w.workoutType,
    distanceKm: w.distanceKm,
    durationMin: w.durationMin,
    targetRpe: w.targetRpe,
    targetPaceMinKm: w.targetPaceMinKm,
    targetPaceMaxKm: w.targetPaceMaxKm,
    isQuality: w.isQuality,
    dayOfWeek: w.dayOfWeek,
    weekNumber: w.weekNumber,
  }));

  const { changed, cancelledIds } = applyProposalToWorkouts(
    workoutRefs,
    snapshot.proposals ?? [],
  );

  const result = await db.transaction(async (tx) => {
    const allVersions = await tx
      .select({ versionNumber: planVersions.versionNumber })
      .from(planVersions)
      .where(eq(planVersions.userId, userId))
      .orderBy(desc(planVersions.versionNumber))
      .limit(1);
    const nextVersion = (allVersions[0]?.versionNumber ?? 0) + 1;

    const [newVersion] = await tx
      .insert(planVersions)
      .values({
        userId,
        raceGoalId: sourceVersion.raceGoalId,
        versionNumber: nextVersion,
        algorithmVersion: sourceVersion.algorithmVersion,
        inputSnapshot: sourceVersion.inputSnapshot,
        createdReason: `adjustment:${proposal.reason}`,
        startsOn: sourceVersion.startsOn,
        endsOn: sourceVersion.endsOn,
        totalWeeks: sourceVersion.totalWeeks,
        warnings: [
          ...(sourceVersion.warnings ?? []),
          `调整自 v${sourceVersion.versionNumber}: ${proposal.reason}`,
        ],
        isActive: false,
      })
      .returning();

    const changeMap = new Map(changed.map((c) => [c.workoutId, c]));
    const dateOwner = new Map<string, string>();
    for (const w of sourceWorkouts) {
      if (cancelledIds.has(w.id)) continue;
      const ch = changeMap.get(w.id);
      dateOwner.set(ch?.scheduledDate ?? w.scheduledDate, w.id);
    }
    for (const ch of changed) {
      if (ch.scheduledDate) dateOwner.set(ch.scheduledDate, ch.workoutId);
    }
    const keepIds = new Set(dateOwner.values());

    const newWorkouts = sourceWorkouts
      .filter((w) => !cancelledIds.has(w.id) && keepIds.has(w.id))
      .map((w) => {
        const ch = changeMap.get(w.id);
        const scheduledDate = ch?.scheduledDate ?? w.scheduledDate;
        return {
          planVersionId: newVersion.id,
          weekNumber: w.weekNumber,
          phase: w.phase,
          dayOfWeek: ch?.scheduledDate ? dayOfWeek(ch.scheduledDate) : w.dayOfWeek,
          scheduledDate,
          workoutType: (ch?.workoutType as typeof w.workoutType) ?? w.workoutType,
          distanceKm: ch?.distanceKm !== undefined ? ch.distanceKm : w.distanceKm,
          durationMin: ch?.durationMin !== undefined ? ch.durationMin : w.durationMin,
          targetRpe: ch?.targetRpe !== undefined ? ch.targetRpe : w.targetRpe,
          targetPaceMinKm:
            ch?.targetPaceMinKm !== undefined ? ch.targetPaceMinKm : w.targetPaceMinKm,
          targetPaceMaxKm:
            ch?.targetPaceMaxKm !== undefined ? ch.targetPaceMaxKm : w.targetPaceMaxKm,
          isQuality: w.isQuality,
          notes: ch?.notes ?? w.notes,
        };
      });

    if (newWorkouts.length > 0) {
      await tx.insert(planWorkouts).values(newWorkouts);
    }

    await tx
      .update(planVersions)
      .set({ isActive: false })
      .where(and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)));

    const [activated] = await tx
      .update(planVersions)
      .set({ isActive: true })
      .where(eq(planVersions.id, newVersion.id))
      .returning();

    const [confirmed] = await tx
      .update(adjustmentProposals)
      .set({
        status: "confirmed",
        planVersionTo: newVersion.id,
        confirmedAt: new Date(),
      })
      .where(eq(adjustmentProposals.id, proposalId))
      .returning();

    return { version: activated, proposal: confirmed };
  });

  return { version: result.version, proposal: result.proposal };
}

export async function rejectProposal(userId: string, proposalId: string) {
  const proposal = await getProposal(userId, proposalId);
  if (!proposal) return { error: "NOT_FOUND" as const, message: "提案不存在" };
  if (proposal.status !== "pending")
    return { error: "NOT_PENDING" as const, message: "提案已处理" };

  const [rejected] = await db
    .update(adjustmentProposals)
    .set({ status: "rejected" })
    .where(
      and(
        eq(adjustmentProposals.id, proposalId),
        eq(adjustmentProposals.userId, userId),
      ),
    )
    .returning();
  return { proposal: rejected };
}

export async function revertProposal(userId: string, proposalId: string) {
  const proposal = await getProposal(userId, proposalId);
  if (!proposal) return { error: "NOT_FOUND" as const, message: "提案不存在" };
  if (proposal.status !== "confirmed")
    return { error: "NOT_CONFIRMED" as const, message: "只能撤销已确认的提案" };
  if (!proposal.planVersionTo)
    return { error: "NO_TARGET_VERSION" as const, message: "缺少目标版本" };

  const recentConfirmed = await db
    .select()
    .from(adjustmentProposals)
    .where(
      and(
        eq(adjustmentProposals.userId, userId),
        eq(adjustmentProposals.status, "confirmed"),
      ),
    )
    .orderBy(desc(adjustmentProposals.confirmedAt))
    .limit(1);
  if (recentConfirmed[0]?.id !== proposalId) {
    return { error: "NOT_LATEST" as const, message: "只能撤销最近一次确认的调课" };
  }

  const currentActive = await db.query.planVersions.findFirst({
    where: and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
  });
  if (!currentActive || currentActive.id !== proposal.planVersionTo) {
    return {
      error: "NOT_ACTIVE_VERSION" as const,
      message: "当前活跃计划已变更，无法撤销",
    };
  }

  return db.transaction(async (tx) => {
    await tx
      .update(planVersions)
      .set({ isActive: false })
      .where(and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)));

    const [reactivated] = await tx
      .update(planVersions)
      .set({ isActive: true })
      .where(
        and(
          eq(planVersions.id, proposal.planVersionFrom),
          eq(planVersions.userId, userId),
        ),
      )
      .returning();

    const [reverted] = await tx
      .update(adjustmentProposals)
      .set({ status: "rejected" })
      .where(eq(adjustmentProposals.id, proposalId))
      .returning();

    return { version: reactivated, proposal: reverted };
  });
}
