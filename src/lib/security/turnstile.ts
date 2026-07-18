/**
 * Cloudflare Turnstile server verification.
 * When TURNSTILE_SECRET_KEY is unset, verification is skipped (local dev).
 */
import { getClientIp } from "@/lib/security/request";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Verify a Turnstile response token.
 * Skips when secret is not configured (dev / optional rollout).
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  request: Request,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }

  if (!token || typeof token !== "string" || token.length < 10) {
    return {
      ok: false,
      code: "TURNSTILE_REQUIRED",
      message: "请完成人机验证",
    };
  }

  if (token.length > 2048) {
    return {
      ok: false,
      code: "TURNSTILE_INVALID",
      message: "人机验证无效，请刷新后重试",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const ip = getClientIp(request);
  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Edge/serverless: short timeout via AbortSignal if available
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      return {
        ok: false,
        code: "TURNSTILE_UNAVAILABLE",
        message: "人机验证服务暂时不可用，请稍后重试",
      };
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
    return {
      ok: false,
      code: "TURNSTILE_UNAVAILABLE",
      message: "人机验证服务暂时不可用，请稍后重试",
    };
  }
}
