import { sql } from "drizzle-orm";
import { db } from "@/db";
import { jsonError, jsonOk } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public readiness probe: checks DATABASE_URL presence and a trivial query.
 * Does not leak secrets. Safe to call from browser Network tab.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (!hasDatabaseUrl) {
    return jsonError(503, "DB_NOT_CONFIGURED", "DATABASE_URL is not set");
  }

  try {
    const started = Date.now();
    await db.execute(sql`select 1`);
    return jsonOk({
      ok: true,
      db: "up",
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[health]", err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(503, "DB_UNAVAILABLE", "database probe failed", {
      // short, non-secret hint for operators
      hint: message.slice(0, 160),
    });
  }
}
