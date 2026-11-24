import { NextResponse } from "next/server";
import { z } from "zod";
import { t } from "@/lib/i18n/ru";
import { profileSchema } from "@/lib/profileSchema";
import { aiEnabled, draftPortfolio } from "@/lib/server/ai";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

const body = z.object({ profile: profileSchema });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const p = parsed.data.profile;
  // Без ИИ — простой шаблон только из фактов анкеты.
  const fallback = {
    about: `Я учусь в ${p.grade <= 11 ? `${p.grade} классе` : `${p.grade - 11} курсе`}, город ${p.city}. Хочу изучать направление «${t.majors[p.major]}».`,
    projects: p.achievementsText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3)
      .slice(0, 4)
      .map((s) => ({ title: s.slice(0, 60), text: "" })),
    source: "rules",
  };
  if (!aiEnabled() || !takeQuota(clientKey(req) + ":portfolio", 10).ok) return NextResponse.json(fallback);
  try {
    return NextResponse.json({ ...(await draftPortfolio(p)), source: "ai" });
  } catch (err) {
    console.error("[portfolio]", err);
    return NextResponse.json(fallback);
  }
}
