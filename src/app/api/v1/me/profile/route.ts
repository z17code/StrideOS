import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  getProfileForUser,
  mapProfile,
  updateProfile,
} from "@/lib/plans/service";
import { updateProfileSchema } from "@/lib/validators/planning";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const profile = await getProfileForUser(auth.user.id);
  if (!profile) {
    return jsonError(404, "PROFILE_NOT_FOUND", "尚未创建跑者档案");
  }
  return jsonOk({ profile: mapProfile(profile) });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await updateProfile(auth.user.id, parsed.data);
  if (!updated) {
    return jsonError(404, "PROFILE_NOT_FOUND", "尚未创建跑者档案");
  }
  return jsonOk({ profile: mapProfile(updated) });
}
