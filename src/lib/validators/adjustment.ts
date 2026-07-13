import { z } from "zod";

export const proposeAdjustmentSchema = z.object({
  reason: z.string().min(1).max(500, "调整原因最长 500 字"),
});

export const confirmAdjustmentSchema = z.object({
  // no body needed for confirmation
});

export const rejectAdjustmentSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export type ProposeAdjustmentInput = z.infer<typeof proposeAdjustmentSchema>;