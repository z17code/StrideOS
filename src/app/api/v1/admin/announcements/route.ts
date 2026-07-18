import { jsonCreated, jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import {
  createAnnouncement,
  listAllAnnouncements,
} from "@/lib/announcements/service";
import { announcementWriteSchema } from "@/lib/validators/announcement";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/announcements */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const items = await listAllAnnouncements();
  return jsonOk({ announcements: items });
}

/** POST /api/v1/admin/announcements */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const origin = assertSameOrigin(request);
  if (!origin.ok) {
    return jsonError(origin.status, origin.code, origin.message);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.status, body.code, body.message);
  }

  const parsed = announcementWriteSchema.safeParse(body.data);
  if (!parsed.success) {
    const first =
      parsed.error.issues[0]?.message ?? "参数校验失败";
    return jsonError(400, "VALIDATION_ERROR", first, parsed.error.flatten());
  }

  try {
    const item = await createAnnouncement(auth.user.id, parsed.data);
    await logAdminAction({
      admin: auth.user,
      action: "announcement.create",
      targetType: "announcement",
      targetId: item.id,
      summary: `创建公告：${item.title}`,
      metadata: { isPublished: item.isPublished, priority: item.priority },
    });
    return jsonCreated({ announcement: item });
  } catch (err) {
    if (err instanceof Error && err.message === "ENDS_BEFORE_STARTS") {
      return jsonError(400, "VALIDATION_ERROR", "结束时间不能早于开始时间");
    }
    if (err instanceof Error && err.message === "INVALID_DATE") {
      return jsonError(400, "VALIDATION_ERROR", "时间格式无效");
    }
    throw err;
  }
}
