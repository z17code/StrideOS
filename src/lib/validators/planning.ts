import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式须为 YYYY-MM-DD");

const weekday = z.number().int().min(0).max(6);

export const recentRaceSchema = z.object({
  distanceKm: z.number().positive().max(100),
  timeSec: z.number().int().positive().max(172_800),
  raceDate: dateOnly,
});

const profileObjectSchema = z.object({
  weeklyDistance: z.number().min(0).max(300),
  weeklyRuns: z.number().int().min(0).max(7),
  longestRun: z.number().min(0).max(100),
  trainableDays: z.array(weekday).min(3).max(7),
  longRunDay: weekday,
  painLevel: z.number().int().min(0).max(10),
  restrictions: z.string().max(1000).optional().nullable(),
  recentRace: recentRaceSchema.optional().nullable(),
});

export const profileFieldsSchema = profileObjectSchema.superRefine(
  (val, ctx) => {
    const unique = new Set(val.trainableDays);
    if (unique.size !== val.trainableDays.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "可训练日不可重复",
        path: ["trainableDays"],
      });
    }
    if (!val.trainableDays.includes(val.longRunDay)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "长跑日必须属于可训练日",
        path: ["longRunDay"],
      });
    }
  },
);

export const goalFieldsSchema = z.object({
  distanceType: z.enum(["10k", "half", "full"]),
  raceDate: dateOnly,
  targetTime: z.number().int().positive().max(172_800).optional().nullable(),
});

export const onboardingCompleteSchema = z.object({
  profile: profileFieldsSchema,
  goal: goalFieldsSchema,
});

export const updateProfileSchema = profileObjectSchema
  .partial()
  .superRefine((val, ctx) => {
    if (val.trainableDays && val.longRunDay != null) {
      if (!val.trainableDays.includes(val.longRunDay)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "长跑日必须属于可训练日",
          path: ["longRunDay"],
        });
      }
    }
  });

export const createGoalSchema = goalFieldsSchema.extend({
  isActive: z.boolean().optional().default(true),
});

export const updateGoalSchema = goalFieldsSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const generatePlanSchema = z.object({
  reason: z.string().min(1).max(200).optional().default("manual"),
});

export const updatePlanVersionSchema = z.object({
  label: z.string().max(100).nullable().optional(),
});

export type ProfileFields = z.infer<typeof profileFieldsSchema>;
export type GoalFields = z.infer<typeof goalFieldsSchema>;
export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
