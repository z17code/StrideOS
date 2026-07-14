import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";
import { requireUser } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "请求体必须是 JSON" } },
      { status: 400 },
    );
  }

  const locale = (body as { locale?: string }).locale;
  if (!isLocale(locale)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "locale 须为 zh-CN 或 en" } },
      { status: 400 },
    );
  }

  const res = NextResponse.json({ ok: true, locale: locale as Locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}