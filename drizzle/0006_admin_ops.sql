-- Migration 0006: admin ops — last login + audit log
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" uuid,
  "admin_username" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "summary" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_users_id_fk"
    FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_id_idx" ON "admin_audit_logs" USING btree ("admin_id");
