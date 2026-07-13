import { NextResponse } from "next/server";
import type { SessionUser } from "./session";
import { getCurrentUser } from "./session";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export async function requireUser(): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: jsonError(401, "UNAUTHORIZED", "请先登录"),
    };
  }
  if (!user.isActive) {
    return {
      error: jsonError(403, "ACCOUNT_DISABLED", "账号已被停用"),
    };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return {
      error: jsonError(403, "FORBIDDEN", "需要管理员权限"),
    };
  }
  return result;
}
