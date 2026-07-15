/**
 * Security helpers: client IP, origin checks, request size, dummy password hash.
 */
import { createHash } from "node:crypto";

/** Max JSON body size for API routes (bytes). */
export const MAX_JSON_BODY_BYTES = 64 * 1024; // 64 KiB

/**
 * Resolve client IP from common proxy headers (Vercel / reverse proxies).
 * Falls back to "unknown".
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  return "unknown";
}

/**
 * Build allowed origins from env + request host.
 * APP_URL / NEXT_PUBLIC_APP_URL may be set in production.
 */
export function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  const extras = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];
  for (const raw of extras) {
    if (!raw) continue;
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      origins.add(u.origin);
    } catch {
      // ignore invalid env
    }
  }

  // Always allow same-origin based on the request URL (works in all envs).
  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // ignore
  }

  // Local dev conveniences
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * For cookie-authenticated state-changing requests, require Origin/Referer
 * to match an allowed origin (CSRF mitigation for same-site lax cookies).
 *
 * Safe methods and requests without Origin+Referer from non-browser clients
 * are handled carefully: browsers always send Origin on cross-site POSTs.
 */
export function assertSameOrigin(request: Request): {
  ok: true;
} | {
  ok: false;
  status: number;
  code: string;
  message: string;
} {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = getAllowedOrigins(request);

  if (origin) {
    if (allowed.has(origin)) return { ok: true };
    return {
      ok: false,
      status: 403,
      code: "ORIGIN_FORBIDDEN",
      message: "请求来源不被允许",
    };
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return { ok: true };
    } catch {
      // fall through
    }
    return {
      ok: false,
      status: 403,
      code: "ORIGIN_FORBIDDEN",
      message: "请求来源不被允许",
    };
  }

  // No Origin/Referer: allow only in development (curl/Postman) or same-site
  // navigations that omit them. In production, prefer rejecting for auth routes.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  // Capacitor / WebView may omit Origin on some platforms — allow when
  // User-Agent looks non-browser-tool and Sec-Fetch-Site is same-origin/none.
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none" || site === "same-site") {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    code: "ORIGIN_REQUIRED",
    message: "缺少合法请求来源",
  };
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; status: number; code: string; message: string }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      return {
        ok: false,
        status: 413,
        code: "PAYLOAD_TOO_LARGE",
        message: "请求体过大",
      };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_BODY",
      message: "无法读取请求体",
    };
  }

  if (text.length > maxBytes) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "请求体过大",
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_JSON",
      message: "请求体必须是 JSON",
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_JSON",
      message: "请求体必须是 JSON",
    };
  }
}

/**
 * Stable dummy scrypt hash for unknown usernames so verify always runs
 * roughly the same duration (mitigate user enumeration via timing).
 * Salt derived from a constant; not a real account.
 */
export const DUMMY_PASSWORD_HASH =
  // Fixed-format dummy (16-byte salt + 64-byte hash) so scrypt always runs fully.
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/** Normalize username for rate-limit keys (case-insensitive). */
export function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase().slice(0, 64);
}

/** Hash IP lightly for bucket keys (avoid storing raw IPs if desired). */
export function ipBucketKey(prefix: string, ip: string): string {
  const digest = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  return `${prefix}:ip:${digest}`;
}

export function usernameBucketKey(prefix: string, username: string): string {
  return `${prefix}:user:${normalizeUsernameKey(username)}`;
}
