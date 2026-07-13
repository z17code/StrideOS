import { z } from "zod";

export const strategyDistanceTypeEnum = z.enum(["10k", "half", "full"]);

export const computeStrategySchema = z.object({
  distanceType: strategyDistanceTypeEnum,
  /** Target finish time in seconds (e.g. 5400 = 1:30:00). */
  targetTimeSec: z
    .number()
    .int()
    .min(10 * 60, "目标成绩至少 10 分钟")
    .max(10 * 3600, "目标成绩至多 10 小时"),
  /** Optional label when saving. */
  label: z.string().max(120).optional().nullable(),
  /** If true, persist the computed strategy. Default false for pure compute. */
  save: z.boolean().optional(),
});

export type ComputeStrategyInput = z.infer<typeof computeStrategySchema>;
