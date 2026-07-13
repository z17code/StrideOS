-- Phase 2 planning extensions
ALTER TYPE "public"."workout_type" ADD VALUE IF NOT EXISTS 'race';--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."plan_phase" AS ENUM('base', 'build', 'specific', 'taper');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "race_goals" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "race_goal_id" uuid;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "version_number" integer;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "starts_on" date;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "ends_on" date;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "total_weeks" integer;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Backfill version numbers for any legacy rows
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn
  FROM plan_versions
)
UPDATE plan_versions SET version_number = ranked.rn
FROM ranked WHERE plan_versions.id = ranked.id AND plan_versions.version_number IS NULL;--> statement-breakpoint
UPDATE plan_versions SET starts_on = CURRENT_DATE WHERE starts_on IS NULL;--> statement-breakpoint
UPDATE plan_versions SET ends_on = CURRENT_DATE WHERE ends_on IS NULL;--> statement-breakpoint
UPDATE plan_versions SET total_weeks = 8 WHERE total_weeks IS NULL;--> statement-breakpoint
ALTER TABLE "plan_versions" ALTER COLUMN "version_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_versions" ALTER COLUMN "starts_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_versions" ALTER COLUMN "ends_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_versions" ALTER COLUMN "total_weeks" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD COLUMN IF NOT EXISTS "phase" "plan_phase";--> statement-breakpoint
UPDATE "plan_workouts" SET "phase" = 'base' WHERE "phase" IS NULL;--> statement-breakpoint
ALTER TABLE "plan_workouts" ALTER COLUMN "phase" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD COLUMN IF NOT EXISTS "target_pace_max_km" real;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD COLUMN IF NOT EXISTS "is_quality" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_race_goal_id_race_goals_id_fk"
    FOREIGN KEY ("race_goal_id") REFERENCES "public"."race_goals"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_versions_race_goal_id_idx" ON "plan_versions" USING btree ("race_goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_versions_user_version_uidx" ON "plan_versions" USING btree ("user_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_versions_one_active_user_uidx" ON "plan_versions" USING btree ("user_id") WHERE is_active = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "race_goals_one_active_user_uidx" ON "race_goals" USING btree ("user_id") WHERE is_active = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_workouts_plan_date_uidx" ON "plan_workouts" USING btree ("plan_version_id","scheduled_date");
