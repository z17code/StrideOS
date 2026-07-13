import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

export const createShoeSchema = z.object({
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  purchaseDate: dateOnly.optional().nullable(),
  totalKm: z.number().min(0).max(5000).optional(),
});

export const updateShoeSchema = z.object({
  brand: z.string().min(1).max(80).optional(),
  model: z.string().min(1).max(80).optional(),
  purchaseDate: dateOnly.optional().nullable(),
  totalKm: z.number().min(0).max(5000).optional(),
  isRetired: z.boolean().optional(),
});

export type CreateShoeInput = z.infer<typeof createShoeSchema>;
export type UpdateShoeInput = z.infer<typeof updateShoeSchema>;
