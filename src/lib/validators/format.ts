import type { ZodError } from "zod";

/**
 * Prefer the first concrete Zod issue message over a generic "参数校验失败".
 */
export function firstZodMessage(
  error: ZodError,
  fallback = "参数校验失败",
): string {
  const first = error.issues[0];
  return first?.message?.trim() || fallback;
}

type Flattened = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

/**
 * Client-side: pick the first message from API error.details (zod flatten).
 */
export function firstFlattenMessage(
  details: unknown,
  fallback?: string,
): string | null {
  if (!details || typeof details !== "object") return fallback ?? null;
  const flat = details as Flattened;
  const form = flat.formErrors?.find((m) => typeof m === "string" && m.trim());
  if (form) return form;
  if (flat.fieldErrors) {
    for (const msgs of Object.values(flat.fieldErrors)) {
      const msg = msgs?.find((m) => typeof m === "string" && m.trim());
      if (msg) return msg;
    }
  }
  return fallback ?? null;
}
