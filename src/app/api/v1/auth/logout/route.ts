import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  destroySession,
} from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySession(token);
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
