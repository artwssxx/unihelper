import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSchema } from "@/lib/profileSchema";
import { aiEnabled, streamChat } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

const DAILY_LIMIT = 20;

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

  const quota = takeQuota(clientKey(req, profileId) + ":chat", DAILY_LIMIT);
  if (!quota.ok) return NextResponse.json({ error: "limit", limit: DAILY_LIMIT }, { status: 429 });

  const headers = { "content-type": "text/plain; charset=utf-8", "x-remaining": String(quota.remaining) };
  if (!aiEnabled()) {
    return new Response(
      "Демо-режим: ИИ-помощник заработает, когда в .env.local будет задан ANTHROPIC_API_KEY. Ваш профиль и подборка уже посчитаны правилами — их можно посмотреть на странице результата.",
      { headers },
    );
  }
  return new Response(streamChat(profile, messages), { headers });
}
