import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  getCheckin,
  listRecentCheckins,
  mapCheckin,
  upsertCheckin,
} from "@/lib/checkins/service";
import { checkinSchema } from "@/lib/validators/checkin";
import { todayInShanghai } from "@/lib/datetime";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (date) {
    const one = await getCheckin(auth.user.id, date);
    return jsonOk({ checkin: one ? mapCheckin(one) : null });
  }

  const checkins = await listRecentCheckins(auth.user.id);
  return jsonOk({ checkins: checkins.map(mapCheckin) });
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

  const payload =
    body && typeof body === "object" && !Array.isArray(body)
      ? {
          ...(body as Record<string, unknown>),
          date:
            (body as Record<string, unknown>).date ?? todayInShanghai(),
        }
      : body;

  const parsed = checkinSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const checkin = await upsertCheckin(auth.user.id, parsed.data);
  return jsonCreated({ checkin: mapCheckin(checkin) });
}
