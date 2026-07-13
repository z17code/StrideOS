import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  createActivity,
  listActivities,
  mapActivity,
} from "@/lib/activities/service";
import { createActivitySchema } from "@/lib/validators/activity";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? "50") || 50,
    100,
  );
  const offset = Math.max(
    Number(url.searchParams.get("offset") ?? "0") || 0,
    0,
  );

  const rows = await listActivities(auth.user.id, limit, offset);
  return jsonOk({ activities: rows.map(mapActivity) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const activity = await createActivity(auth.user.id, parsed.data);
  // Same mutationId returns the existing row (idempotent)
  return jsonCreated({ activity: mapActivity(activity) });
}
