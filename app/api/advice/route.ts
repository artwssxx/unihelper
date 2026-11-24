import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSchema } from "@/lib/profileSchema";
import { aiEnabled, generateAdvice } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { scoreProfile } from "@/lib/scoring/strength";

export const maxDuration = 60;

const body = z.object({ profile: profileSchema, profileId: z.string().max(64).nullish() });

// 3 совета. С ключом ИИ — персональные, без ключа или при ошибке — из правил (lib/scoring).
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { profile, profileId } = parsed.data;
  const ruleTips = scoreProfile(profile).tips.map((t) => {
    const [title, ...rest] = t.split(/:\s+/);
    return { title, action: rest.join(": ") || "" };
  });

  if (!aiEnabled() || !takeQuota(clientKey(req, profileId) + ":advice", 5).ok) {
    return NextResponse.json({ tips: ruleTips, source: "rules" });
  }
  try {
    const advice = await generateAdvice(profile);
    return NextResponse.json({ ...advice, source: "ai" });
  } catch (err) {
    console.error("[advice]", err);
    return NextResponse.json({ tips: ruleTips, source: "rules" });
  }
}
