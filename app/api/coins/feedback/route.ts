import { NextResponse } from "next/server";
import { z } from "zod";
import { TASKS } from "@/lib/coins";
import { award, coinCtx } from "@/lib/server/coins";
import { isResponse } from "@/lib/server/community";
import { notifyAdmins } from "@/lib/server/telegram";

const body = z.object({ rating: z.number().int().min(1).max(5), text: z.string().trim().min(30).max(2000) });

// Отзыв о UniHelper: сохраняется для команды, награда — один раз.
export async function POST(req: Request) {
  const c = await coinCtx(req);
  if (isResponse(c)) return c;
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", message: "Оценка и отзыв от 30 символов." }, { status: 400 });
  const { data: was } = await c.db.from("feedback").select("id").eq("user_id", c.user.id).maybeSingle();
  if (!was) await c.db.from("feedback").insert({ user_id: c.user.id, rating: p.data.rating, text: p.data.text });
  const reward = TASKS.find((t) => t.id === "feedback")!.reward;
  const ok = await award(c.db, c.user.id, reward, "task", "feedback");
  if (!was) await notifyAdmins(`Отзыв ${p.data.rating}/5: ${p.data.text.slice(0, 300)}`).catch(() => {});
  return NextResponse.json({ ok: true, awarded: ok ? reward : 0 });
}
