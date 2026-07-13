import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  destroySession,
} from "@/lib/auth/session";
import { jsonOk } from "@/lib/auth/guards";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySession(token);
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
