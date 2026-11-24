import { NextResponse } from "next/server";
import { z } from "zod";
import { ruleCheck } from "@/lib/essayRules";
import { aiEnabled, checkEssay } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { limitsFor } from "@/lib/server/plan";

export const maxDuration = 60;

const body = z.object({ prompt: z.string().max(1000), text: z.string().min(50).max(15000) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { prompt, text } = parsed.data;
  // Free: 3 ИИ-проверки (лимит в памяти сервера; строгий учёт — таблица usage).
  // Лимит по тарифу (в памяти сервера; строгий учёт по аккаунту — таблица usage).
  const limit = limitsFor(req).essayAiPerMonth;
  if (!aiEnabled() || !takeQuota(clientKey(req) + ":essay:" + limit, limit).ok) {
    return NextResponse.json({ ...ruleCheck(text), limited: aiEnabled() });
  }
  try {
    return NextResponse.json(await checkEssay(prompt, text));
  } catch (err) {
    console.error("[essay]", err);
    return NextResponse.json(ruleCheck(text));
  }
}
