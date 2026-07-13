import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

export const workoutTypeEnum = z.enum([
  "easy", "recovery", "long", "threshold", "intervals",
  "specific", "strength", "rest", "race",
]);

export const createActivitySchema = z.object({
  date: dateOnly,
  workoutType: workoutTypeEnum,
  distanceKm: z.number().min(0).max(200).optional().nullable(),
  durationMin: z.number().int().min(0).max(1440).optional().nullable(),
  actualRpe: z.number().int().min(1).max(10).optional().nullable(),
  avgHeartRate: z.number().int().min(30).max(250).optional().nullable(),
  painLevel: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  shoeId: z.string().uuid().optional().nullable(),
  planWorkoutId: z.string().uuid().optional().nullable(),
  mutationId: z.string().min(1).max(128).optional(),
});

export const updateActivitySchema = z.object({
  date: dateOnly.optional(),
  workoutType: workoutTypeEnum.optional(),
  distanceKm: z.number().min(0).max(200).optional().nullable(),
  durationMin: z.number().int().min(0).max(1440).optional().nullable(),
  actualRpe: z.number().int().min(1).max(10).optional().nullable(),
  avgHeartRate: z.number().int().min(30).max(250).optional().nullable(),
  painLevel: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  shoeId: z.string().uuid().optional().nullable(),
  planWorkoutId: z.string().uuid().optional().nullable(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;