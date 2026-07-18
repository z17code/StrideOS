-- Migration 0008: multiple named TOTP authenticators
CREATE TABLE IF NOT EXISTS "totp_authenticators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "secret_enc" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "totp_authenticators"
    ADD CONSTRAINT "totp_authenticators_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "totp_authenticators_user_id_idx" ON "totp_authenticators" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_pending_name" text;
--> statement-breakpoint
-- Move legacy single-secret users into authenticator rows (idempotent by name+secret)
INSERT INTO "totp_authenticators" ("user_id", "name", "secret_enc", "created_at")
SELECT u."id", '默认验证器', u."totp_secret_enc", COALESCE(u."totp_enabled_at", now())
FROM "users" u
WHERE u."totp_enabled" = true
  AND u."totp_secret_enc" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "totp_authenticators" a WHERE a."user_id" = u."id"
  );
