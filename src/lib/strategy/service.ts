import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  raceStrategies,
  type RaceStrategy as RaceStrategyRow,
} from "@/db/schema";
import {
  buildRaceStrategy,
  type RaceStrategy as EngineStrategy,
  type StrategyDistanceType,
  type TrainingPaces,
  type EquivalentRaceTimes,
  type StrategySegment,
} from "@/lib/strategy/engine";
import type { ComputeStrategyInput } from "@/lib/validators/strategy";

export function computeStrategy(
  distanceType: StrategyDistanceType,
  targetTimeSec: number,
): EngineStrategy {
  return buildRaceStrategy(distanceType, targetTimeSec);
}

export function mapStrategy(row: RaceStrategyRow) {
  return {
    id: row.id,
    distanceType: row.distanceType,
    targetTimeSec: row.targetTimeSec,
    vdot: row.vdot,
    averagePaceMinPerKm: row.averagePaceMinPerKm,
    trainingPaces: row.trainingPaces as TrainingPaces,
    equivalentTimes: row.equivalentTimes as EquivalentRaceTimes,
    segments: row.segments as StrategySegment[],
    label: row.label,
    createdAt: row.createdAt,
  };
}

export async function getStrategy(userId: string, id: string) {
  return db.query.raceStrategies.findFirst({
    where: and(
      eq(raceStrategies.id, id),
      eq(raceStrategies.userId, userId),
    ),
  });
}

export async function listStrategies(userId: string, limit = 50, offset = 0) {
  return db
    .select()
    .from(raceStrategies)
    .where(eq(raceStrategies.userId, userId))
    .orderBy(desc(raceStrategies.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createStrategy(
  userId: string,
  data: ComputeStrategyInput,
) {
  const computed = computeStrategy(data.distanceType, data.targetTimeSec);
  const [created] = await db
    .insert(raceStrategies)
    .values({
      userId,
      distanceType: computed.distanceType,
      targetTimeSec: computed.targetTimeSec,
      vdot: computed.vdot,
      averagePaceMinPerKm: computed.averagePaceMinPerKm,
      trainingPaces: computed.trainingPaces,
      equivalentTimes: computed.equivalentTimes,
      segments: computed.segments,
      label: data.label ?? null,
    })
    .returning();
  return created;
}

export async function deleteStrategy(userId: string, id: string) {
  const existing = await getStrategy(userId, id);
  if (!existing) return null;
  await db
    .delete(raceStrategies)
    .where(
      and(eq(raceStrategies.id, id), eq(raceStrategies.userId, userId)),
    );
  return existing;
}
