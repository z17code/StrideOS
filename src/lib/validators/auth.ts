import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "用户名至少 3 个字符")
  .max(32, "用户名最多 32 个字符")
  .regex(/^[a-zA-Z0-9_一-龥]+$/, "用户名仅支持中英文、数字和下划线");

export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 个字符")
  .max(128, "密码最多 128 个字符");

export const registerSchema = z.object({
  inviteCode: z.string().min(1, "请输入邀请码"),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1, "请输入重置令牌"),
  newPassword: passwordSchema,
});

export const createInviteCodeSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
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
