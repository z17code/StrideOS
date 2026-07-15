import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { generateToken, hashToken } from "./tokens";

export { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "strideos_session";
const SESSION_DAYS = 30;

function cookieSecure(): boolean {
  if (process.env.FORCE_SECURE_COOKIES === "1") return true;
  if (process.env.NODE_ENV === "production") return true;
  // Vercel preview always HTTPS
  if (process.env.VERCEL === "1") return true;
  return false;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function destroySession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = Pick<
  User,
  "id" | "username" | "email" | "role" | "isActive" | "createdAt"
>;

export async function getSessionUser(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const row = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
    )
    .limit(1);

  const session = row[0];
  if (!session || !session.isActive) return null;

  return {
    id: session.id,
    username: session.username,
    email: session.email,
    role: session.role,
    isActive: session.isActive,
    createdAt: session.createdAt,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return getSessionUser(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
