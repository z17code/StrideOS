import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

export const strengthExerciseSchema = z.object({
  name: z.string().min(1).max(60),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(100).optional(),
  weightKg: z.number().min(0).max(500).optional().nullable(),
  durationSec: z.number().int().min(1).max(3600).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
});

export const createStrengthSchema = z.object({
  date: dateOnly,
  templateId: z.string().min(1).max(60).optional().nullable(),
  completed: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
  exercises: z.array(strengthExerciseSchema).optional(),
  durationMin: z.number().int().min(1).max(300).optional().nullable(),
});

export const updateStrengthSchema = z.object({
  date: dateOnly.optional(),
  templateId: z.string().min(1).max(60).optional().nullable(),
  completed: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
  exercises: z.array(strengthExerciseSchema).optional(),
  durationMin: z.number().int().min(1).max(300).optional().nullable(),
});

export type CreateStrengthInput = z.infer<typeof createStrengthSchema>;
export type UpdateStrengthInput = z.infer<typeof updateStrengthSchema>;
export type StrengthExercise = z.infer<typeof strengthExerciseSchema>;
