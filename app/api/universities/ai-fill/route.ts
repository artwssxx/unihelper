import { NextResponse } from "next/server";
import { z } from "zod";
import { MAJORS } from "@/lib/profileSchema";
import { aiEnabled, draftUniversity } from "@/lib/server/ai";
import { limitsFor } from "@/lib/server/plan";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { consumeUnlock } from "@/lib/server/coins";

export const maxDuration = 60;

const body = z.object({
  name: z.string().min(2).max(200),
  country: z.string().regex(/^[A-Z]{2}$/),
  website: z.string().max(300).nullish(),
  major: z.enum(MAJORS),
});

// ИИ-черновик требований для своего вуза. Pro. Всё помечается «черновик ИИ, не проверено».
export async function POST(req: Request) {
  if (!limitsFor(req).aiUniversityFill && !(await consumeUnlock(req, "ai_uni_fill"))) return NextResponse.json({ error: "pro_required", coins: "ai_uni_fill" }, { status: 402 });
  if (!aiEnabled()) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  if (!takeQuota(clientKey(req) + ":unifill", 20).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return NextResponse.json({ draft: await draftUniversity(parsed.data) });
  } catch (err) {
    console.error("[unifill]", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
