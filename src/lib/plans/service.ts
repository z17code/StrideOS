import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  planVersions,
  planWorkouts,
  raceGoals,
  runnerProfiles,
  type PlanVersion,
  type PlanWorkout,
  type RaceGoal,
  type RunnerProfile,
} from "@/db/schema";
import { todayInShanghai } from "@/lib/datetime";
import { generatePlan } from "@/lib/plans/engine";
import {
  ALGORITHM_VERSION,
  type GeneratedPlan,
  type PlanEngineInput,
  PlanEngineError,
} from "@/lib/plans/types";
import type {
  GoalFields,
  OnboardingCompleteInput,
  ProfileFields,
} from "@/lib/validators/planning";

// ─── DTO mappers ─────────────────────────────────────────

export function mapProfile(p: RunnerProfile) {
  const races = p.recentRaceTimes ?? [];
  const first = races[0];
  let recentRace: {
    distanceKm: number;
    timeSec: number;
    raceDate: string;
  } | null = null;

  if (first) {
    // Support legacy {distance,timeSec,date} and new {distanceKm,timeSec,raceDate}
    const any = first as Record<string, unknown>;
    const distanceKm =
      typeof any.distanceKm === "number"
        ? any.distanceKm
        : typeof any.distance === "string"
          ? Number.parseFloat(any.distance)
          : NaN;
    const timeSec = typeof any.timeSec === "number" ? any.timeSec : NaN;
    const raceDate =
      typeof any.raceDate === "string"
        ? any.raceDate
        : typeof any.date === "string"
          ? any.date
          : null;
    if (Number.isFinite(distanceKm) && Number.isFinite(timeSec) && raceDate) {
      recentRace = { distanceKm, timeSec, raceDate };
    }
  }

  return {
    weeklyDistance: p.weeklyDistance,
    weeklyRuns: p.weeklyRuns,
    longestRun: p.longestRun,
    trainableDays: p.trainableDays,
    longRunDay: p.longRunDay,
    painLevel: p.painLevel,
    restrictions: p.restrictions,
    recentRace,
    onboardingCompleted: Boolean(p.onboardingCompletedAt),
    onboardingCompletedAt: p.onboardingCompletedAt,
    updatedAt: p.updatedAt,
  };
}

export function mapGoal(g: RaceGoal) {
  return {
    id: g.id,
    distanceType: g.distanceType,
    raceDate: g.raceDate,
    targetTime: g.targetTime,
    isActive: g.isActive,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export function mapPlanVersion(
  v: PlanVersion,
  workouts?: PlanWorkout[],
) {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    algorithmVersion: v.algorithmVersion,
    createdReason: v.createdReason,
    startsOn: v.startsOn,
    endsOn: v.endsOn,
    totalWeeks: v.totalWeeks,
    warnings: v.warnings,
    isActive: v.isActive,
    raceGoalId: v.raceGoalId,
    createdAt: v.createdAt,
    workouts: workouts
      ?.slice()
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .map(mapWorkout),
  };
}

export function mapWorkout(w: PlanWorkout) {
  return {
    id: w.id,
    weekNumber: w.weekNumber,
    phase: w.phase,
    dayOfWeek: w.dayOfWeek,
    scheduledDate: w.scheduledDate,
    workoutType: w.workoutType,
    distanceKm: w.distanceKm,
    durationMin: w.durationMin,
    targetRpe: w.targetRpe,
    targetPaceMinKm: w.targetPaceMinKm,
    targetPaceMaxKm: w.targetPaceMaxKm,
    isQuality: w.isQuality,
    notes: w.notes,
  };
}

// ─── Profile / goal helpers ──────────────────────────────

function toRecentRaceJson(
  race: ProfileFields["recentRace"],
): Array<{ distanceKm: number; timeSec: number; raceDate: string }> | null {
  if (!race) return null;
  return [
    {
      distanceKm: race.distanceKm,
      timeSec: race.timeSec,
      raceDate: race.raceDate,
    },
  ];
}

export async function getProfileForUser(userId: string) {
  return db.query.runnerProfiles.findFirst({
    where: eq(runnerProfiles.userId, userId),
  });
}

export async function getActiveGoal(userId: string) {
  return db.query.raceGoals.findFirst({
    where: and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)),
  });
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingCompleteInput,
) {
  const now = new Date();
  return db.transaction(async (tx) => {
    // Lock user-scoped mutations via profile row
    const existing = await tx.query.runnerProfiles.findFirst({
      where: eq(runnerProfiles.userId, userId),
    });

    let profile: RunnerProfile;
    if (existing) {
      const [updated] = await tx
        .update(runnerProfiles)
        .set({
          weeklyDistance: data.profile.weeklyDistance,
          weeklyRuns: data.profile.weeklyRuns,
          longestRun: data.profile.longestRun,
          trainableDays: data.profile.trainableDays,
          longRunDay: data.profile.longRunDay,
          painLevel: data.profile.painLevel,
          restrictions: data.profile.restrictions?.trim() || null,
          recentRaceTimes: toRecentRaceJson(data.profile.recentRace),
          onboardingCompletedAt: existing.onboardingCompletedAt ?? now,
          updatedAt: now,
        })
        .where(eq(runnerProfiles.userId, userId))
        .returning();
      profile = updated;
    } else {
      const [created] = await tx
        .insert(runnerProfiles)
        .values({
          userId,
          weeklyDistance: data.profile.weeklyDistance,
          weeklyRuns: data.profile.weeklyRuns,
          longestRun: data.profile.longestRun,
          trainableDays: data.profile.trainableDays,
          longRunDay: data.profile.longRunDay,
          painLevel: data.profile.painLevel,
          restrictions: data.profile.restrictions?.trim() || null,
          recentRaceTimes: toRecentRaceJson(data.profile.recentRace),
          onboardingCompletedAt: now,
          updatedAt: now,
        })
        .returning();
      profile = created;
    }

    // Upsert active goal
    const active = await tx.query.raceGoals.findFirst({
      where: and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)),
    });

    let goal: RaceGoal;
    if (active) {
      const [updated] = await tx
        .update(raceGoals)
        .set({
          distanceType: data.goal.distanceType,
          raceDate: data.goal.raceDate,
          targetTime: data.goal.targetTime ?? null,
          updatedAt: now,
        })
        .where(and(eq(raceGoals.id, active.id), eq(raceGoals.userId, userId)))
        .returning();
      goal = updated;
    } else {
      // Deactivate any stray actives (should be none)
      await tx
        .update(raceGoals)
        .set({ isActive: false, updatedAt: now })
        .where(and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)));

      const [created] = await tx
        .insert(raceGoals)
        .values({
          userId,
          distanceType: data.goal.distanceType,
          raceDate: data.goal.raceDate,
          targetTime: data.goal.targetTime ?? null,
          isActive: true,
          updatedAt: now,
        })
        .returning();
      goal = created;
    }

    return { profile, goal };
  });
}

export async function updateProfile(userId: string, data: Partial<ProfileFields>) {
  const now = new Date();
  const existing = await getProfileForUser(userId);
  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(runnerProfiles)
    .set({
      ...(data.weeklyDistance !== undefined
        ? { weeklyDistance: data.weeklyDistance }
        : {}),
      ...(data.weeklyRuns !== undefined ? { weeklyRuns: data.weeklyRuns } : {}),
      ...(data.longestRun !== undefined ? { longestRun: data.longestRun } : {}),
      ...(data.trainableDays !== undefined
        ? { trainableDays: data.trainableDays }
        : {}),
      ...(data.longRunDay !== undefined ? { longRunDay: data.longRunDay } : {}),
      ...(data.painLevel !== undefined ? { painLevel: data.painLevel } : {}),
      ...(data.restrictions !== undefined
        ? { restrictions: data.restrictions?.trim() || null }
        : {}),
      ...(data.recentRace !== undefined
        ? { recentRaceTimes: toRecentRaceJson(data.recentRace) }
        : {}),
      updatedAt: now,
    })
    .where(eq(runnerProfiles.userId, userId))
    .returning();

  return updated;
}

export async function listGoals(userId: string) {
  return db
    .select()
    .from(raceGoals)
    .where(eq(raceGoals.userId, userId))
    .orderBy(desc(raceGoals.createdAt));
}

export async function createGoal(userId: string, data: GoalFields & { isActive?: boolean }) {
  const now = new Date();
  const makeActive = data.isActive !== false;

  return db.transaction(async (tx) => {
    if (makeActive) {
      await tx
        .update(raceGoals)
        .set({ isActive: false, updatedAt: now })
        .where(and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)));

      // New active goal invalidates previous plan identity
      await tx
        .update(planVersions)
        .set({ isActive: false })
        .where(
          and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
        );
    }

    const [created] = await tx
      .insert(raceGoals)
      .values({
        userId,
        distanceType: data.distanceType,
        raceDate: data.raceDate,
        targetTime: data.targetTime ?? null,
        isActive: makeActive,
        updatedAt: now,
      })
      .returning();

    return created;
  });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: Partial<GoalFields> & { isActive?: boolean },
) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const existing = await tx.query.raceGoals.findFirst({
      where: and(eq(raceGoals.id, goalId), eq(raceGoals.userId, userId)),
    });
    if (!existing) return null;

    if (data.isActive === true && !existing.isActive) {
      await tx
        .update(raceGoals)
        .set({ isActive: false, updatedAt: now })
        .where(and(eq(raceGoals.userId, userId), eq(raceGoals.isActive, true)));
      await tx
        .update(planVersions)
        .set({ isActive: false })
        .where(
          and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
        );
    }

    const [updated] = await tx
      .update(raceGoals)
      .set({
        ...(data.distanceType !== undefined
          ? { distanceType: data.distanceType }
          : {}),
        ...(data.raceDate !== undefined ? { raceDate: data.raceDate } : {}),
        ...(data.targetTime !== undefined
          ? { targetTime: data.targetTime }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedAt: now,
      })
      .where(and(eq(raceGoals.id, goalId), eq(raceGoals.userId, userId)))
      .returning();

    return updated;
  });
}

export async function deleteGoal(userId: string, goalId: string) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.raceGoals.findFirst({
      where: and(eq(raceGoals.id, goalId), eq(raceGoals.userId, userId)),
    });
    if (!existing) return null;

    if (existing.isActive) {
      await tx
        .update(planVersions)
        .set({ isActive: false })
        .where(
          and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
        );
    }

    await tx
      .delete(raceGoals)
      .where(and(eq(raceGoals.id, goalId), eq(raceGoals.userId, userId)));

    return existing;
  });
}

// ─── Plans ───────────────────────────────────────────────

export async function listPlanVersions(userId: string) {
  return db
    .select()
    .from(planVersions)
    .where(eq(planVersions.userId, userId))
    .orderBy(desc(planVersions.versionNumber));
}

export async function getActivePlan(userId: string) {
  const version = await db.query.planVersions.findFirst({
    where: and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
  });
  if (!version) return null;
  const workouts = await db
    .select()
    .from(planWorkouts)
    .where(eq(planWorkouts.planVersionId, version.id))
    .orderBy(planWorkouts.scheduledDate);
  return { version, workouts };
}

export async function getPlanVersion(userId: string, versionId: string) {
  const version = await db.query.planVersions.findFirst({
    where: and(eq(planVersions.id, versionId), eq(planVersions.userId, userId)),
  });
  if (!version) return null;
  const workouts = await db
    .select()
    .from(planWorkouts)
    .where(eq(planWorkouts.planVersionId, version.id))
    .orderBy(planWorkouts.scheduledDate);
  return { version, workouts };
}

export async function getWorkoutForUser(userId: string, workoutId: string) {
  const rows = await db
    .select({
      workout: planWorkouts,
      plan: planVersions,
    })
    .from(planWorkouts)
    .innerJoin(planVersions, eq(planWorkouts.planVersionId, planVersions.id))
    .where(
      and(eq(planWorkouts.id, workoutId), eq(planVersions.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

function profileToEngineInput(
  profile: RunnerProfile,
  goal: RaceGoal,
  generationDate: string,
): PlanEngineInput {
  const mapped = mapProfile(profile);
  if (
    mapped.weeklyDistance == null ||
    mapped.weeklyRuns == null ||
    mapped.longestRun == null ||
    !mapped.trainableDays ||
    mapped.longRunDay == null ||
    mapped.painLevel == null
  ) {
    throw new PlanEngineError(
      "PROFILE_INCOMPLETE",
      "跑者档案不完整，请先完成入门",
    );
  }

  return {
    generationDate,
    distanceType: goal.distanceType,
    raceDate: goal.raceDate,
    targetTimeSec: goal.targetTime,
    weeklyDistanceKm: mapped.weeklyDistance,
    weeklyRuns: mapped.weeklyRuns,
    longestRunKm: mapped.longestRun,
    trainableDays: mapped.trainableDays,
    longRunDay: mapped.longRunDay,
    painLevel: mapped.painLevel,
    restrictions: mapped.restrictions,
    recentRace: mapped.recentRace,
  };
}

export async function generateAndPersistPlan(
  userId: string,
  reason: string,
  generationDate: string = todayInShanghai(),
): Promise<{ version: PlanVersion; workouts: PlanWorkout[]; generated: GeneratedPlan }> {
  const profile = await getProfileForUser(userId);
  if (!profile?.onboardingCompletedAt) {
    throw new PlanEngineError("ONBOARDING_REQUIRED", "请先完成入门问卷");
  }
  const goal = await getActiveGoal(userId);
  if (!goal) {
    throw new PlanEngineError("NO_ACTIVE_GOAL", "请先设置活跃比赛目标");
  }

  const engineInput = profileToEngineInput(profile, goal, generationDate);
  const generated = generatePlan(engineInput);

  return db.transaction(async (tx) => {
    // Deactivate previous active plan first would risk empty state on failure —
    // allocate version, insert fully, then flip active.

    const [{ max }] = await tx
      .select({
        max: sql<number>`coalesce(max(${planVersions.versionNumber}), 0)`,
      })
      .from(planVersions)
      .where(eq(planVersions.userId, userId));

    const versionNumber = Number(max) + 1;

    const [version] = await tx
      .insert(planVersions)
      .values({
        userId,
        raceGoalId: goal.id,
        versionNumber,
        algorithmVersion: ALGORITHM_VERSION,
        inputSnapshot: generated.inputSnapshot,
        createdReason: reason,
        startsOn: generated.startsOn,
        endsOn: generated.endsOn,
        totalWeeks: generated.totalWeeks,
        warnings: generated.warnings.map((w) => `${w.code}: ${w.message}`),
        isActive: false,
      })
      .returning();

    const workoutRows = generated.workouts.map((w) => ({
      planVersionId: version.id,
      weekNumber: w.weekNumber,
      phase: w.phase,
      dayOfWeek: w.dayOfWeek,
      scheduledDate: w.scheduledDate,
      workoutType: w.workoutType,
      distanceKm: w.distanceKm,
      durationMin: w.durationMin,
      targetRpe: w.targetRpe,
      targetPaceMinKm: w.targetPaceMinKm,
      targetPaceMaxKm: w.targetPaceMaxKm,
      isQuality: w.isQuality,
      notes: w.notes,
    }));

    const inserted =
      workoutRows.length > 0
        ? await tx.insert(planWorkouts).values(workoutRows).returning()
        : [];

    await tx
      .update(planVersions)
      .set({ isActive: false })
      .where(
        and(eq(planVersions.userId, userId), eq(planVersions.isActive, true)),
      );

    const [activated] = await tx
      .update(planVersions)
      .set({ isActive: true })
      .where(and(eq(planVersions.id, version.id), eq(planVersions.userId, userId)))
      .returning();

    return { version: activated, workouts: inserted, generated };
  });
}
