import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  date,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const distanceTypeEnum = pgEnum("distance_type", [
  "10k",
  "half",
  "full",
]);

export const workoutTypeEnum = pgEnum("workout_type", [
  "easy",
  "recovery",
  "long",
  "threshold",
  "intervals",
  "specific",
  "strength",
  "rest",
  "race",
]);

export const planPhaseEnum = pgEnum("plan_phase", [
  "base",
  "build",
  "specific",
  "taper",
]);

export const adjustmentStatusEnum = pgEnum("adjustment_status", [
  "pending",
  "confirmed",
  "rejected",
]);

// ─── Users & Auth ────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    email: text("email"),
    role: userRoleEnum("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_username_uidx").on(t.username)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uidx").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    usedByUserId: uuid("used_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdByAdminId: uuid("created_by_admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("invite_codes_code_uidx").on(t.code)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdByAdminId: uuid("created_by_admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("password_reset_tokens_token_hash_uidx").on(t.tokenHash)],
);

// ─── Runner profile & goals ──────────────────────────────

export const runnerProfiles = pgTable(
  "runner_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weeklyDistance: real("weekly_distance"),
    weeklyRuns: integer("weekly_runs"),
    longestRun: real("longest_run"),
    recentRaceTimes: jsonb("recent_race_times").$type<
      Array<{
        distanceKm?: number;
        distance?: string;
        timeSec: number;
        raceDate?: string;
        date?: string;
      }>
    >(),
    trainableDays: jsonb("trainable_days").$type<number[]>(),
    longRunDay: integer("long_run_day"),
    painLevel: integer("pain_level"),
    restrictions: text("restrictions"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    onboardingSkippedAt: timestamp("onboarding_skipped_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("runner_profiles_user_id_uidx").on(t.userId)],
);

export const raceGoals = pgTable(
  "race_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    distanceType: distanceTypeEnum("distance_type").notNull(),
    raceDate: date("race_date").notNull(),
    targetTime: integer("target_time"), // seconds
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("race_goals_user_id_idx").on(t.userId),
    uniqueIndex("race_goals_one_active_user_uidx")
      .on(t.userId)
      .where(sql`${t.isActive} = true`),
  ],
);

// ─── Training plans ──────────────────────────────────────

export const planVersions = pgTable(
  "plan_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    raceGoalId: uuid("race_goal_id")
      .notNull()
      .references(() => raceGoals.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    inputSnapshot: jsonb("input_snapshot").notNull(),
    createdReason: text("created_reason").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    totalWeeks: integer("total_weeks").notNull(),
    label: text("label"),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("plan_versions_user_id_idx").on(t.userId),
    index("plan_versions_race_goal_id_idx").on(t.raceGoalId),
    uniqueIndex("plan_versions_user_version_uidx").on(
      t.userId,
      t.versionNumber,
    ),
    uniqueIndex("plan_versions_one_active_user_uidx")
      .on(t.userId)
      .where(sql`${t.isActive} = true`),
  ],
);

export const planWorkouts = pgTable(
  "plan_workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planVersionId: uuid("plan_version_id")
      .notNull()
      .references(() => planVersions.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    phase: planPhaseEnum("phase").notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // JS/PG: 0=Sun … 6=Sat
    scheduledDate: date("scheduled_date").notNull(),
    workoutType: workoutTypeEnum("workout_type").notNull(),
    distanceKm: real("distance_km"),
    durationMin: integer("duration_min"),
    targetRpe: integer("target_rpe"),
    targetPaceMinKm: real("target_pace_min_km"),
    targetPaceMaxKm: real("target_pace_max_km"),
    isQuality: boolean("is_quality").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [
    index("plan_workouts_plan_version_id_idx").on(t.planVersionId),
    index("plan_workouts_scheduled_date_idx").on(t.scheduledDate),
    uniqueIndex("plan_workouts_plan_date_uidx").on(
      t.planVersionId,
      t.scheduledDate,
    ),
  ],
);

// ─── Activities & check-ins ──────────────────────────────

export const shoes = pgTable(
  "shoes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    purchaseDate: date("purchase_date"),
    totalKm: real("total_km").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    isRetired: boolean("is_retired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("shoes_user_id_idx").on(t.userId)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    workoutType: text("workout_type").notNull(),
    distanceKm: real("distance_km"),
    durationMin: integer("duration_min"),
    actualRpe: integer("actual_rpe"),
    avgHeartRate: integer("avg_heart_rate"),
    painLevel: integer("pain_level"),
    notes: text("notes"),
    shoeId: uuid("shoe_id").references(() => shoes.id, {
      onDelete: "set null",
    }),
    planWorkoutId: uuid("plan_workout_id").references(() => planWorkouts.id, {
      onDelete: "set null",
    }),
    mutationId: text("mutation_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activities_user_id_idx").on(t.userId),
    index("activities_date_idx").on(t.date),
    uniqueIndex("activities_user_mutation_uidx").on(t.userId, t.mutationId),
  ],
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    fatigueLevel: integer("fatigue_level").notNull(), // 1-5
    painLevel: integer("pain_level").notNull(), // 0-10
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_checkins_user_date_uidx").on(t.userId, t.date),
    index("daily_checkins_user_id_idx").on(t.userId),
  ],
);

export const adjustmentProposals = pgTable(
  "adjustment_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planVersionFrom: uuid("plan_version_from")
      .notNull()
      .references(() => planVersions.id, { onDelete: "cascade" }),
    planVersionTo: uuid("plan_version_to").references(() => planVersions.id, {
      onDelete: "set null",
    }),
    changesSnapshot: jsonb("changes_snapshot").notNull(),
    reason: text("reason").notNull(),
    status: adjustmentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [index("adjustment_proposals_user_id_idx").on(t.userId)],
);

export const strengthSessions = pgTable(
  "strength_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    templateId: text("template_id"),
    exercises: jsonb("exercises").$type<
      Array<{
        name: string;
        sets?: number;
        reps?: number;
        weightKg?: number | null;
        durationSec?: number | null;
        note?: string | null;
      }>
    >(),
    durationMin: integer("duration_min"),
    completed: boolean("completed").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("strength_sessions_user_id_idx").on(t.userId)],
);

// ─── Race strategies (Phase 4) ───────────────────────────

export const raceStrategies = pgTable(
  "race_strategies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    distanceType: distanceTypeEnum("distance_type").notNull(),
    targetTimeSec: integer("target_time_sec").notNull(),
    vdot: real("vdot").notNull(),
    averagePaceMinPerKm: real("average_pace_min_per_km").notNull(),
    trainingPaces: jsonb("training_paces").notNull(),
    equivalentTimes: jsonb("equivalent_times").notNull(),
    segments: jsonb("segments").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("race_strategies_user_id_idx").on(t.userId)],
);

// ─── Relations ───────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(runnerProfiles, {
    fields: [users.id],
    references: [runnerProfiles.userId],
  }),
  sessions: many(sessions),
  goals: many(raceGoals),
  planVersions: many(planVersions),
  activities: many(activities),
  checkins: many(dailyCheckins),
  shoes: many(shoes),
  strengthSessions: many(strengthSessions),
  raceStrategies: many(raceStrategies),
}));

export const planVersionsRelations = relations(planVersions, ({ one, many }) => ({
  user: one(users, {
    fields: [planVersions.userId],
    references: [users.id],
  }),
  workouts: many(planWorkouts),
}));

export const planWorkoutsRelations = relations(planWorkouts, ({ one }) => ({
  planVersion: one(planVersions, {
    fields: [planWorkouts.planVersionId],
    references: [planVersions.id],
  }),
}));

// ─── Types ───────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type RunnerProfile = typeof runnerProfiles.$inferSelect;
export type RaceGoal = typeof raceGoals.$inferSelect;
export type PlanVersion = typeof planVersions.$inferSelect;
export type PlanWorkout = typeof planWorkouts.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type AdjustmentProposal = typeof adjustmentProposals.$inferSelect;
export type Shoe = typeof shoes.$inferSelect;
export type StrengthSession = typeof strengthSessions.$inferSelect;
export type RaceStrategy = typeof raceStrategies.$inferSelect;
export type NewRaceStrategy = typeof raceStrategies.$inferInsert;
