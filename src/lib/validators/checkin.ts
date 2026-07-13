import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

export const checkinSchema = z.object({
  date: dateOnly,
  fatigueLevel: z.number().int().min(1).max(5, "疲劳评分 1–5"),
  painLevel: z.number().int().min(0).max(10, "疼痛评分 0–10"),
  notes: z.string().max(500).optional().nullable(),
});

export const updateCheckinSchema = z.object({
  fatigueLevel: z.number().int().min(1).max(5).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;