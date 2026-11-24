import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import type { TgUpdate } from "@/lib/telegram/bot";
import { botEnabled, handleUpdate, webhookSecret } from "@/lib/server/tgBot";

export const maxDuration = 60;

// Вебхук Telegram. Принимаем только запросы с секретом, который мы передали в setWebhook.
export async function POST(req: Request) {
  if (!botEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(webhookSecret());
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update || typeof update.update_id !== "number") return NextResponse.json({ ok: true });
  // Отвечаем Telegram сразу (иначе он повторит обновление), а обрабатываем после ответа: ответ ИИ может идти до 30 с.
  after(() => handleUpdate(update).catch((e) => console.error("[tg webhook]", (e as Error).message)));
  return NextResponse.json({ ok: true });
}
