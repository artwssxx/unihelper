import { NextResponse } from "next/server";
import { z } from "zod";
import { makeLinkCode } from "@/lib/telegram/bot";
import { getUser } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase";
import { botEnabled, linkSecret } from "@/lib/server/tgBot";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

async function ctx(req: Request) {
  const db = supabaseAdmin();
  const user = await getUser(req);
  return db && user ? { db, user } : null;
}

// Статус привязки Telegram к аккаунту.
export async function GET(req: Request) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await c.db.from("user_state").select("telegram_id,telegram_username,tg_notify").eq("user_id", c.user.id).maybeSingle();
  return NextResponse.json({ available: botEnabled() && Boolean(BOT), bot: BOT ?? null, linked: Boolean(data?.telegram_id), username: data?.telegram_username ?? null, notify: data?.tg_notify ?? true });
}

// Ссылка t.me/<бот>?start=<код> — действует час, подписана ключом бота.
export async function POST(req: Request) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!botEnabled() || !BOT) return NextResponse.json({ error: "not_configured", message: "Бот ещё не настроен." }, { status: 503 });
  return NextResponse.json({ url: `https://t.me/${BOT}?start=${makeLinkCode(c.user.id, linkSecret())}` });
}

const patch = z.object({ notify: z.boolean() });
export async function PATCH(req: Request) {
  const c = await ctx(req);
  if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await c.db.from("user_state").update({ tg_notify: p.data.notify }).eq("user_id", c.user.id);
  return NextResponse.json({ ok: true });
}
