import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import {
  deleteAnnouncement,
  updateAnnouncement,
} from "@/lib/announcements/service";
import { announcementUpdateSchema } from "@/lib/validators/announcement";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/** PUT /api/v1/admin/announcements/:id */
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const origin = assertSameOrigin(request);
  if (!origin.ok) {
    return jsonError(origin.status, origin.code, origin.message);
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.status, body.code, body.message);
  }

  const parsed = announcementUpdateSchema.safeParse(body.data);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "参数校验失败";
    return jsonError(400, "VALIDATION_ERROR", first, parsed.error.flatten());
  }

  try {
    const item = await updateAnnouncement(id, parsed.data);
    if (!item) {
      return jsonError(404, "NOT_FOUND", "公告不存在");
    }
    await logAdminAction({
      admin: auth.user,
      action: "announcement.update",
      targetType: "announcement",
      targetId: item.id,
      summary: `更新公告：${item.title}`,
      metadata: {
        isPublished: item.isPublished,
        priority: item.priority,
        fields: Object.keys(parsed.data),
      },
    });
    return jsonOk({ announcement: item });
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

/** DELETE /api/v1/admin/announcements/:id */
export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const origin = assertSameOrigin(request);
  if (!origin.ok) {
    return jsonError(origin.status, origin.code, origin.message);
  }

  const { id } = await params;
  const ok = await deleteAnnouncement(id);
  if (!ok) {
    return jsonError(404, "NOT_FOUND", "公告不存在");
  }

  await logAdminAction({
    admin: auth.user,
    action: "announcement.delete",
    targetType: "announcement",
    targetId: id,
    summary: "删除公告",
  });

  return jsonOk({ ok: true });
}
