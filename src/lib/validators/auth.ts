import { z } from "zod";
import {
  ADMIN_DELETE_USER_CONFIRMATION,
  DELETE_ACCOUNT_CONFIRMATION,
} from "@/lib/auth/delete-account-constants";

export const usernameSchema = z
  .string()
  .min(3, "用户名至少 3 个字符")
  .max(32, "用户名最多 32 个字符")
  .regex(/^[a-zA-Z0-9_一-龥]+$/, "用户名仅支持中英文、数字和下划线");

/**
 * Password policy: length + basic complexity (not just digits/letters alone).
 * Avoid overly strict rules that frustrate users; block common weak patterns.
 */
export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 个字符")
  .max(128, "密码最多 128 个字符")
  .refine((p) => !/\s/.test(p), "密码不能包含空格")
  .refine(
    (p) => /[A-Za-z]/.test(p) && /\d/.test(p),
    "密码需同时包含字母和数字",
  )
  .refine((p) => {
    const lower = p.toLowerCase();
    const blocked = [
      "password",
      "12345678",
      "123456789",
      "qwertyui",
      "strideos",
      "admin123",
      "password1",
    ];
    return !blocked.some((b) => lower === b || lower.includes(b));
  }, "密码过于简单，请换一个更安全的密码");

export const registerSchema = z.object({
  inviteCode: z.string().min(1, "请输入邀请码").max(64, "邀请码过长"),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名").max(64, "用户名过长"),
  password: z.string().min(1, "请输入密码").max(128, "密码过长"),
});

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1, "请输入重置令牌").max(256, "令牌过长"),
  newPassword: passwordSchema,
});

export const createInviteCodeSchema = z.object({
  /** Omit or null = never expires. */
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
  count: z.number().int().min(1).max(50).optional().default(1),
});

export const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  username: usernameSchema.optional(),
  adminNote: z.string().max(200).optional().nullable(),
});

export const adminCreateResetTokenSchema = z.object({
  userId: z.string().uuid(),
  expiresInHours: z.number().int().min(1).max(168).optional().default(24),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_ACCOUNT_CONFIRMATION, {
    errorMap: () => ({ message: "请完整输入确认文案" }),
  }),
});

export const adminDeleteUserSchema = z.object({
  confirmation: z.literal(ADMIN_DELETE_USER_CONFIRMATION, {
    errorMap: () => ({ message: "请完整输入确认文案" }),
  }),
});

