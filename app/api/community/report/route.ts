import { NextResponse } from "next/server";
import { z } from "zod";
import { communityCtx, isResponse } from "@/lib/server/community";
import { takeQuota } from "@/lib/server/rateLimit";
import { notifyAdmins } from "@/lib/server/telegram";

const body = z.object({
  targetType: z.enum(["post", "message", "profile", "org"]),
  targetId: z.string().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  if (!takeQuota(`id:${c.user.id}:reports`, 30).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: "Опиши причину жалобы." }, { status: 400 });
  const { targetType, targetId, reason } = parsed.data;
  const { error } = await c.db.from("community_reports").insert({ reporter_id: c.user.id, target_type: targetType, target_id: targetId, reason });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  await notifyAdmins(`Жалоба в комьюнити (${targetType}): ${reason.slice(0, 200)}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
