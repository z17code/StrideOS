-- Migration 0007: TOTP 2FA + pending login challenge tokens
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret_enc" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_pending_secret_enc" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "totp_backup_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "code_hash" text NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "totp_backup_codes"
    ADD CONSTRAINT "totp_backup_codes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "totp_backup_codes_user_id_idx" ON "totp_backup_codes" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_2fa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pending_2fa"
    ADD CONSTRAINT "pending_2fa_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_2fa_token_hash_uidx" ON "pending_2fa" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_2fa_user_id_idx" ON "pending_2fa" USING btree ("user_id");
