import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

export const strengthTemplateIdEnum = z.enum([
  "core",
  "hips",
  "calves",
  "balance",
  "mobility",
]);

export const createStrengthSchema = z.object({
  date: dateOnly,
  templateId: strengthTemplateIdEnum,
  completed: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateStrengthSchema = z.object({
  date: dateOnly.optional(),
  templateId: strengthTemplateIdEnum.optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateStrengthInput = z.infer<typeof createStrengthSchema>;
export type UpdateStrengthInput = z.infer<typeof updateStrengthSchema>;
