-- Schema alignment: formalize fields previously applied via db:push
-- Idempotent where possible (IF NOT EXISTS / conditional type change)

-- Onboarding skip
ALTER TABLE "runner_profiles" ADD COLUMN IF NOT EXISTS "onboarding_skipped_at" timestamp with time zone;--> statement-breakpoint

-- Plan version rename label
ALTER TABLE "plan_versions" ADD COLUMN IF NOT EXISTS "label" text;--> statement-breakpoint

-- race_goal_id is required by current app schema (only enforce when no nulls remain)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plan_versions'
      AND column_name = 'race_goal_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1 FROM plan_versions WHERE race_goal_id IS NULL
  ) THEN
    ALTER TABLE "plan_versions" ALTER COLUMN "race_goal_id" SET NOT NULL;
  END IF;
END $$;--> statement-breakpoint

-- Strength: custom sessions (optional template + exercises JSON + duration)
ALTER TABLE "strength_sessions" ALTER COLUMN "template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "strength_sessions" ADD COLUMN IF NOT EXISTS "exercises" jsonb;--> statement-breakpoint
ALTER TABLE "strength_sessions" ADD COLUMN IF NOT EXISTS "duration_min" integer;--> statement-breakpoint

-- Activities: free-text workout_type (no longer constrained to workout_type enum)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND column_name = 'workout_type'
      AND udt_name = 'workout_type'
  ) THEN
    ALTER TABLE "activities"
      ALTER COLUMN "workout_type" TYPE text
      USING "workout_type"::text;
  END IF;
END $$;
