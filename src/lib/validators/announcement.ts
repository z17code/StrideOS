import { z } from "zod";

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "时间格式无效" });

export const announcementWriteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "标题不能为空")
    .max(120, "标题最多 120 字"),
  body: z
    .string()
    .trim()
    .min(1, "内容不能为空")
    .max(4000, "内容最多 4000 字"),
  isPublished: z.boolean().optional().default(false),
  priority: z.number().int().min(-1000).max(1000).optional().default(0),
  /** ISO string or null to clear */
  startsAt: isoDateTime.nullable().optional(),
  endsAt: isoDateTime.nullable().optional(),
});

export const announcementUpdateSchema = announcementWriteSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个字段" });

export type AnnouncementWriteInput = z.infer<typeof announcementWriteSchema>;
export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateSchema>;
