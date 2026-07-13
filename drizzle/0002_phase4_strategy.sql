-- Phase 4: race strategies (VDOT / negative-split)
CREATE TABLE IF NOT EXISTS "race_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"distance_type" "distance_type" NOT NULL,
	"target_time_sec" integer NOT NULL,
	"vdot" real NOT NULL,
	"average_pace_min_per_km" real NOT NULL,
	"training_paces" jsonb NOT NULL,
	"equivalent_times" jsonb NOT NULL,
	"segments" jsonb NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "race_strategies" ADD CONSTRAINT "race_strategies_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "race_strategies_user_id_idx" ON "race_strategies" USING btree ("user_id");
