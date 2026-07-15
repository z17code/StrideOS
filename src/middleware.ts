import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware: basic abuse / CSRF surface for API.
 * Heavy rate-limit lives in auth routes (DB-backed).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Never expose directory listings / block common probe paths early.
  if (
    pathname.startsWith("/.env") ||
    pathname.startsWith("/wp-") ||
    pathname.startsWith("/.git") ||
    pathname === "/server-status"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Reject oversized Content-Length early (auth also re-checks body).
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > 256 * 1024) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "请求体过大",
          },
        },
        { status: 413 },
      );
    }
  }

  // CSRF-ish origin check for state-changing API calls.
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    const site = request.headers.get("sec-fetch-site");

    const allowedHosts = new Set<string>();
    if (host) allowedHosts.add(host.toLowerCase());
    if (process.env.VERCEL_URL) {
      allowedHosts.add(process.env.VERCEL_URL.toLowerCase());
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowedHosts.add(process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase());
    }
    for (const raw of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
      if (!raw) continue;
      try {
        allowedHosts.add(
          new URL(raw.includes("://") ? raw : `https://${raw}`).host.toLowerCase(),
        );
      } catch {
        // ignore
      }
    }

    const hostOf = (value: string | null): string | null => {
      if (!value) return null;
      try {
        return new URL(value).host.toLowerCase();
      } catch {
        return null;
      }
    };

    if (origin) {
      const oHost = hostOf(origin);
      if (oHost && !allowedHosts.has(oHost)) {
        return NextResponse.json(
          {
            error: {
              code: "ORIGIN_FORBIDDEN",
              message: "请求来源不被允许",
            },
          },
          { status: 403 },
        );
      }
    } else if (referer) {
      const rHost = hostOf(referer);
      if (rHost && !allowedHosts.has(rHost)) {
        return NextResponse.json(
          {
            error: {
              code: "ORIGIN_FORBIDDEN",
              message: "请求来源不被允许",
            },
          },
          { status: 403 },
        );
      }
    } else if (
      process.env.NODE_ENV === "production" &&
      site &&
      site !== "same-origin" &&
      site !== "same-site" &&
      site !== "none"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "ORIGIN_REQUIRED",
            message: "缺少合法请求来源",
          },
        },
        { status: 403 },
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/.env",
    "/.env/:path*",
    "/.git/:path*",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/server-status",
  ],
};
