import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  shoes,
  planWorkouts,
  type Activity,
  type Shoe,
} from "@/db/schema";
import type {
  CreateActivityInput,
  UpdateActivityInput,
} from "@/lib/validators/activity";

export function mapActivity(a: Activity) {
  return {
    id: a.id,
    date: a.date,
    workoutType: a.workoutType,
    distanceKm: a.distanceKm,
    durationMin: a.durationMin,
    actualRpe: a.actualRpe,
    avgHeartRate: a.avgHeartRate,
    painLevel: a.painLevel,
    notes: a.notes,
    shoeId: a.shoeId,
    planWorkoutId: a.planWorkoutId,
    mutationId: a.mutationId,
    createdAt: a.createdAt,
  };
}

export function mapShoe(s: Shoe) {
  return {
    id: s.id,
    brand: s.brand,
    model: s.model,
    purchaseDate: s.purchaseDate,
    totalKm: s.totalKm,
    lastUsedAt: s.lastUsedAt,
    isRetired: s.isRetired,
    createdAt: s.createdAt,
  };
}

export async function getActivity(userId: string, activityId: string) {
  return db.query.activities.findFirst({
    where: and(eq(activities.id, activityId), eq(activities.userId, userId)),
  });
}

export async function listActivities(userId: string, limit = 50, offset = 0) {
  return db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.date), desc(activities.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createActivity(
  userId: string,
  data: CreateActivityInput,
): Promise<Activity> {
  if (data.mutationId) {
    const existing = await db.query.activities.findFirst({
      where: and(
        eq(activities.userId, userId),
        eq(activities.mutationId, data.mutationId),
      ),
    });
    if (existing) return existing;
  }

  const [created] = await db
    .insert(activities)
    .values({
      userId,
      date: data.date,
      workoutType: data.workoutType,
      distanceKm: data.distanceKm ?? null,
      durationMin: data.durationMin ?? null,
      actualRpe: data.actualRpe ?? null,
      avgHeartRate: data.avgHeartRate ?? null,
      painLevel: data.painLevel ?? null,
      notes: data.notes ?? null,
      shoeId: data.shoeId ?? null,
      planWorkoutId: data.planWorkoutId ?? null,
      mutationId: data.mutationId ?? null,
    })
    .returning();

  if (created && data.shoeId && data.distanceKm != null && data.distanceKm > 0) {
    await db
      .update(shoes)
      .set({
        totalKm: sql`${shoes.totalKm} + ${data.distanceKm}`,
        lastUsedAt: new Date(),
      })
      .where(and(eq(shoes.id, data.shoeId), eq(shoes.userId, userId)));
  }

  return created;
}

export async function updateActivity(
  userId: string,
  activityId: string,
  data: UpdateActivityInput,
) {
  const existing = await getActivity(userId, activityId);
  if (!existing) return null;
  const [updated] = await db
    .update(activities)
    .set({
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.workoutType !== undefined ? { workoutType: data.workoutType } : {}),
      ...(data.distanceKm !== undefined ? { distanceKm: data.distanceKm } : {}),
      ...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
      ...(data.actualRpe !== undefined ? { actualRpe: data.actualRpe } : {}),
      ...(data.avgHeartRate !== undefined ? { avgHeartRate: data.avgHeartRate } : {}),
      ...(data.painLevel !== undefined ? { painLevel: data.painLevel } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.shoeId !== undefined ? { shoeId: data.shoeId } : {}),
      ...(data.planWorkoutId !== undefined ? { planWorkoutId: data.planWorkoutId } : {}),
    })
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
    .returning();
  return updated;
}

export async function deleteActivity(userId: string, activityId: string) {
  const existing = await getActivity(userId, activityId);
  if (!existing) return null;
  await db
    .delete(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
  return existing;
}

export async function getShoes(userId: string) {
  return db
    .select()
    .from(shoes)
    .where(eq(shoes.userId, userId))
    .orderBy(asc(shoes.brand), asc(shoes.model));
}

export async function linkPlanWorkoutInfo(planWorkoutId: string) {
  const workout = await db.query.planWorkouts.findFirst({
    where: eq(planWorkouts.id, planWorkoutId),
  });
  if (!workout) return null;
  return {
    workoutType: workout.workoutType,
    scheduledDate: workout.scheduledDate,
    distanceKm: workout.distanceKm,
    durationMin: workout.durationMin,
    targetRpe: workout.targetRpe,
    planVersionId: workout.planVersionId,
  };
}
