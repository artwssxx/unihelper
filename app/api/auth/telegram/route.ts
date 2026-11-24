import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabase";
import { verifyLoginWidget, verifyWebAppInitData, type TgUser } from "@/lib/server/telegramAuth";

// Вход через Telegram: сайт (Login Widget) и мини-приложение (initData).
// После проверки подписи создаём/находим пользователя Supabase и выдаём одноразовый токен входа.
const body = z.union([
  z.object({ mode: z.literal("widget"), data: z.record(z.string(), z.union([z.string(), z.number()])) }),
  z.object({ mode: z.literal("webapp"), initData: z.string().max(4096) }),
]);

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":tglogin", 30).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const db = supabaseAdmin();
  if (!token || !db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const tg: TgUser | null = parsed.data.mode === "widget" ? verifyLoginWidget(parsed.data.data, token) : verifyWebAppInitData(parsed.data.initData, token);
  if (!tg?.id) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  const email = `tg${tg.id}@telegram.unihelper.app`;
  const name = [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || "Telegram";
  const meta = { full_name: name, telegram_id: tg.id, telegram_username: tg.username ?? null, avatar_url: tg.photo_url ?? null, provider: "telegram" };
  const created = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    console.error("[tg login] create", created.error.message);
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }
  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.properties?.hashed_token) {
    console.error("[tg login] link", link.error?.message);
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }
  const userId = link.data.user?.id;
  if (userId) {
    await db.auth.admin.updateUserById(userId, { user_metadata: meta });
    await db.from("user_state").upsert({ user_id: userId, telegram_id: tg.id, telegram_username: tg.username ?? null, display_name: name, avatar_url: tg.photo_url ?? null }, { onConflict: "user_id" });
  }
  return NextResponse.json({ tokenHash: link.data.properties.hashed_token });
}
