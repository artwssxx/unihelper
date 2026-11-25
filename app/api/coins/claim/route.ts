import { NextResponse } from "next/server";
import { z } from "zod";
import { claimTask, coinCtx } from "@/lib/server/coins";
import { isResponse } from "@/lib/server/community";
import { takeQuota } from "@/lib/server/rateLimit";

const body = z.object({ task: z.enum(["profile", "telegram_bot", "telegram_channel", "instagram", "tiktok", "youtube", "community_card", "portfolio_public", "first_mock"]) });

export async function POST(req: Request) {
  const c = await coinCtx(req);
  if (isResponse(c)) return c;
  if (!takeQuota(`id:${c.user.id}:claim`, 60).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const r = await claimTask(c.db, c.user.id, p.data.task);
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
