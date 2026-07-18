/**
 * Cloudflare Turnstile server verification.
 *
 * Default is soft mode (China-friendly):
 * - No secret configured → skip (local dev)
 * - Missing token → allow (script blocked / slow network); rate limits still apply
 * - Provided token fails verification → reject
 * - Siteverify network/HTTP failure → allow (soft)
 *
 * Set TURNSTILE_STRICT=1 to require a valid token whenever secret is configured.
 */
import { getClientIp } from "@/lib/security/request";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function isTurnstileStrict(): boolean {
  const v = process.env.TURNSTILE_STRICT?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export type TurnstileVerifyResult =
  | { ok: true; soft?: boolean }
  | { ok: false; code: string; message: string };

/**
 * Verify a Turnstile response token.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  request: Request,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }

  const strict = isTurnstileStrict();
  const hasToken =
    typeof token === "string" && token.trim().length >= 10;

  if (!hasToken) {
    if (strict) {
      return {
        ok: false,
        code: "TURNSTILE_REQUIRED",
        message: "请完成人机验证",
      };
    }
    // Soft allow: widget may be blocked (e.g. regional network) or still loading.
    return { ok: true, soft: true };
  }

  const cleaned = token!.trim();
  if (cleaned.length > 2048) {
    return {
      ok: false,
      code: "TURNSTILE_INVALID",
      message: "人机验证无效，请刷新后重试",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", cleaned);
  const ip = getClientIp(request);
  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      if (strict) {
        return {
          ok: false,
          code: "TURNSTILE_UNAVAILABLE",
          message: "人机验证服务暂时不可用，请稍后重试",
        };
      }
      return { ok: true, soft: true };
    }

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (data.success) {
      return { ok: true };
    }

    console.warn("[turnstile] failed", data["error-codes"]);
    return {
      ok: false,
      code: "TURNSTILE_FAILED",
      message: "人机验证未通过，请刷新后重试",
    };
  } catch (err) {
    console.error("[turnstile] verify error", err);
    if (strict) {
      return {
        ok: false,
        code: "TURNSTILE_UNAVAILABLE",
        message: "人机验证服务暂时不可用，请稍后重试",
      };
    }
    return { ok: true, soft: true };
  }
}
