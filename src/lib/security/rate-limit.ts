/**
 * DB-backed rate limiting / lockout for auth endpoints.
 * Works across Vercel serverless instances (unlike pure in-memory maps).
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authRateLimits } from "@/db/schema";

export type RateLimitPolicy = {
  /** Max failures (or attempts) inside one window before lock. */
  maxHits: number;
  /** Sliding window length in ms. */
  windowMs: number;
  /** How long to lock after maxHits, in ms. */
  lockMs: number;
};

export const LOGIN_IP_POLICY: RateLimitPolicy = {
  maxHits: 20,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const LOGIN_USER_POLICY: RateLimitPolicy = {
  maxHits: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
};

export const REGISTER_IP_POLICY: RateLimitPolicy = {
  maxHits: 8,
  windowMs: 60 * 60 * 1000,
  lockMs: 60 * 60 * 1000,
};

export const RESET_IP_POLICY: RateLimitPolicy = {
  maxHits: 10,
  windowMs: 60 * 60 * 1000,
  lockMs: 30 * 60 * 1000,
};

export type RateLimitStatus = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  lockedUntil: Date | null;
};

function secondsUntil(date: Date | null, now: Date): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

/**
 * Check whether a bucket is currently locked or over limit (read-only).
 */
export async function checkRateLimit(
  bucket: string,
  policy: RateLimitPolicy,
): Promise<RateLimitStatus> {
  const now = new Date();
  try {
    const row = await db.query.authRateLimits.findFirst({
      where: eq(authRateLimits.bucket, bucket),
    });

    if (!row) {
      return {
        allowed: true,
        remaining: policy.maxHits,
        retryAfterSec: 0,
        lockedUntil: null,
      };
    }

    if (row.lockedUntil && row.lockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: secondsUntil(row.lockedUntil, now),
        lockedUntil: row.lockedUntil,
      };
    }

    const windowExpired =
      now.getTime() - row.windowStart.getTime() >= policy.windowMs;
    if (windowExpired) {
      return {
        allowed: true,
        remaining: policy.maxHits,
        retryAfterSec: 0,
        lockedUntil: null,
      };
    }

    const remaining = Math.max(0, policy.maxHits - row.hits);
    if (remaining <= 0) {
      const lockedUntil =
        row.lockedUntil && row.lockedUntil > now
          ? row.lockedUntil
          : new Date(now.getTime() + policy.lockMs);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: secondsUntil(lockedUntil, now),
        lockedUntil,
      };
    }

    return {
      allowed: true,
      remaining,
      retryAfterSec: 0,
      lockedUntil: null,
    };
  } catch (err) {
    // Fail open on infra errors so login is not hard-down if table missing.
    console.error("[rate-limit] check failed", err);
    return {
      allowed: true,
      remaining: policy.maxHits,
      retryAfterSec: 0,
      lockedUntil: null,
    };
  }
}

/**
 * Record a hit (failed login / attempt). May engage lock.
 */
export async function hitRateLimit(
  bucket: string,
  policy: RateLimitPolicy,
): Promise<RateLimitStatus> {
  const now = new Date();
  try {
    const existing = await db.query.authRateLimits.findFirst({
      where: eq(authRateLimits.bucket, bucket),
    });

    if (!existing) {
      await db.insert(authRateLimits).values({
        bucket,
        hits: 1,
        windowStart: now,
        lockedUntil: null,
        updatedAt: now,
      });
      return {
        allowed: true,
        remaining: Math.max(0, policy.maxHits - 1),
        retryAfterSec: 0,
        lockedUntil: null,
      };
    }

    // Still locked — keep current lock (do not stack forever).
    if (existing.lockedUntil && existing.lockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: secondsUntil(existing.lockedUntil, now),
        lockedUntil: existing.lockedUntil,
      };
    }

    const windowExpired =
      now.getTime() - existing.windowStart.getTime() >= policy.windowMs;

    let hits = windowExpired ? 1 : existing.hits + 1;
    const windowStart = windowExpired ? now : existing.windowStart;
    let lockedUntil: Date | null = null;

    if (hits >= policy.maxHits) {
      lockedUntil = new Date(now.getTime() + policy.lockMs);
      hits = policy.maxHits;
    }

    await db
      .update(authRateLimits)
      .set({
        hits,
        windowStart,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(authRateLimits.id, existing.id));

    if (lockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: secondsUntil(lockedUntil, now),
        lockedUntil,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, policy.maxHits - hits),
      retryAfterSec: 0,
      lockedUntil: null,
    };
  } catch (err) {
    console.error("[rate-limit] hit failed", err);
    return {
      allowed: true,
      remaining: policy.maxHits,
      retryAfterSec: 0,
      lockedUntil: null,
    };
  }
}

/** Clear counters after successful auth for a bucket. */
export async function clearRateLimit(bucket: string): Promise<void> {
  try {
    await db.delete(authRateLimits).where(eq(authRateLimits.bucket, bucket));
  } catch (err) {
    console.error("[rate-limit] clear failed", err);
  }
}

/**
 * Best-effort prune of stale unlocked rows (optional maintenance).
 */
export async function pruneStaleRateLimits(olderThanMs = 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - olderThanMs);
  try {
    await db
      .delete(authRateLimits)
      .where(
        sql`(${authRateLimits.lockedUntil} is null or ${authRateLimits.lockedUntil} < ${cutoff})
            and ${authRateLimits.updatedAt} < ${cutoff}`,
      );
  } catch (err) {
    console.error("[rate-limit] prune failed", err);
  }
}

export function rateLimitHeaders(status: RateLimitStatus): HeadersInit {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(status.remaining),
  };
  if (!status.allowed && status.retryAfterSec > 0) {
    headers["Retry-After"] = String(status.retryAfterSec);
  }
  return headers;
}

export function formatLockMessage(retryAfterSec: number): string {
  if (retryAfterSec <= 0) {
    return "尝试次数过多，请稍后再试";
  }
  if (retryAfterSec < 60) {
    return `尝试次数过多，请 ${retryAfterSec} 秒后再试`;
  }
  const mins = Math.ceil(retryAfterSec / 60);
  return `尝试次数过多，请 ${mins} 分钟后再试`;
}
