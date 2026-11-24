import { NextResponse } from "next/server";
import { z } from "zod";
import { communityCtx, isResponse } from "@/lib/server/community";

const body = z.object({ userId: z.string().uuid(), block: z.boolean() });

// Блокировка: заблокированный не может писать тебе, и вы не видите друг друга в ленте и поиске.
export async function POST(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === c.user.id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId, block } = parsed.data;
  if (block) await c.db.from("community_blocks").upsert({ blocker_id: c.user.id, blocked_id: userId }, { onConflict: "blocker_id,blocked_id" });
  else await c.db.from("community_blocks").delete().eq("blocker_id", c.user.id).eq("blocked_id", userId);
  return NextResponse.json({ ok: true });
}
