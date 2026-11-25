import { NextResponse } from "next/server";
import { z } from "zod";
import { buy, coinCtx, setPlanCookie } from "@/lib/server/coins";
import { isResponse } from "@/lib/server/community";

const body = z.object({
  item: z.enum(["pro_day", "pro_week", "hard_mock", "writing_ai", "essay_check", "chat_pack", "ai_uni_fill", "fit_reasons", "portfolio_pro"]),
  ref: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const c = await coinCtx(req);
  if (isResponse(c)) return c;
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const r = await buy(c.db, c.user.id, p.data.item, p.data.ref ?? "");
  if (!r.ok) return NextResponse.json({ error: "failed", message: r.message }, { status: 409 });
  const res = NextResponse.json({ ok: true, balance: r.balance, pro: Boolean(r.planCookie) });
  if (r.planCookie) setPlanCookie(res, r.planCookie);
  return res;
}
