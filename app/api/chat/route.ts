import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSchema } from "@/lib/profileSchema";
import { aiEnabled, streamChat } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { limitsFor } from "@/lib/server/plan";
import { consumeUnlock } from "@/lib/server/coins";

const DAILY_LIMIT = 20;

export const maxDuration = 60;

const body = z.object({
  profile: profileSchema,
  profileId: z.string().max(64).nullish(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { profile, profileId, messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "invalid" }, { status: 400 });

  const daily = limitsFor(req).chatPerDay ?? DAILY_LIMIT;
  const quota = takeQuota(clientKey(req, profileId) + ":chat:" + daily, daily);
  // Лимит исчерпан — пакет сообщений за UniCoins (каждое сообщение тратит одно).
  if (!quota.ok && !(await consumeUnlock(req, "chat_pack"))) return NextResponse.json({ error: "limit", limit: daily, coins: "chat_pack" }, { status: 429 });

  const headers = { "content-type": "text/plain; charset=utf-8", "x-remaining": String(quota.remaining) };
  if (!aiEnabled()) {
    return new Response(
      "Демо-режим: ИИ-помощник заработает, когда в .env.local будет задан ANTHROPIC_API_KEY. Ваш профиль и подборка уже посчитаны правилами — их можно посмотреть на странице результата.",
      { headers },
    );
  }
  return new Response(streamChat(profile, messages), { headers });
}
