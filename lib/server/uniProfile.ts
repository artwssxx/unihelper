import "server-only";
import type { Lang } from "@/lib/i18n/translate";
import { safeLink, uniKey, type UniProfile, type UniProfileResponse, type UniRef } from "@/lib/uniProfile";
import { UniProfileSchema } from "@/lib/uniProfileSchema";
import { llm } from "./llm";
import { LANG_RULE } from "./replyLang";
import { supabaseAdmin } from "./supabase";

// Профиль вуза из справочника: сначала общий кеш (Supabase uni_profiles), иначе — ИИ один раз для всех.
// ИИ даёт только то, в чём уверен; ссылки — только официальные https; всё помечено как черновик.

const SYSTEM = `Ты составляешь карточку университета для школьников из Узбекистана, которые поступают на бакалавриат за рубежом.
Правила:
- Указывай ТОЛЬКО то, в чём уверен. Не знаешь числа или даты — null или «сверить на официальном сайте». Не выдумывай суммы, сроки, рейтинги и стипендии.
- Стоимость — для иностранных студентов, в долларах США в год. Рейтинг QS/THE — только если вуз точно в рейтинге.
- Стипендии — только реальные (государственные, вуза, известные фонды), с пометкой, доступны ли гражданам Узбекистана.
- Ссылки — только на официальный сайт вуза и его страницы (приём, стоимость, стипендии).
- majorsOffered — только из списка: cs, engineering, business, economics, medicine, ir, design, natural_sciences.
- Это черновик: его проверит эксперт, а ученик сверит на сайте вуза.`;

function clean(p: UniProfile): UniProfile {
  const n = (v: number | null, min: number, max: number) => (v != null && v >= min && v <= max ? v : null);
  return {
    ...p,
    website: safeLink(p.website),
    qsRank: n(p.qsRank, 1, 1600),
    theRank: n(p.theRank, 1, 2000),
    acceptanceRate: n(p.acceptanceRate, 0.001, 1),
    tuitionUsd: n(p.tuitionUsd, 0, 150000),
    livingUsd: n(p.livingUsd, 0, 60000),
    applicationFeeUsd: n(p.applicationFeeUsd, 0, 500),
    requirements: { ...p.requirements, minIelts: n(p.requirements.minIelts, 4, 9), minToefl: n(p.requirements.minToefl, 30, 120), minGpa100: n(p.requirements.minGpa100, 40, 100) },
    typical: { ielts: n(p.typical.ielts, 4, 9), sat: n(p.typical.sat, 400, 1600), gpa100: n(p.typical.gpa100, 40, 100) },
    links: p.links.filter((l) => safeLink(l.url)).slice(0, 6),
    scholarships: p.scholarships.slice(0, 8),
    deadlines: p.deadlines.slice(0, 6),
  };
}

export async function getUniProfile(ref: UniRef, lang: Lang, canGenerate: boolean): Promise<UniProfileResponse | { error: "login_required" | "ai_unavailable" | "unknown" }> {
  const db = supabaseAdmin();
  const key = uniKey(lang, ref.country, ref.name);
  if (db) {
    const { data } = await db.from("uni_profiles").select("data, updated_at").eq("key", key).maybeSingle();
    if (data) return { profile: data.data as UniProfile, cached: true, updatedAt: data.updated_at };
  }
  if (!canGenerate) return { error: "login_required" };
  const m = llm();
  if (!m) return { error: "ai_unavailable" };
  let raw: UniProfile;
  try {
    raw = await m.json({
      tier: "smart",
      schema: UniProfileSchema,
      timeoutMs: 55_000,
      maxTokens: 4000,
      system: `${SYSTEM}\n- ${LANG_RULE[lang]}`,
      user: `Вуз: ${ref.name}\nСтрана (ISO2): ${ref.country}\nСайт из справочника: ${ref.web ?? "неизвестен"}`,
    });
  } catch (e) {
    console.error("[uni profile]", (e as Error).message);
    return { error: "ai_unavailable" };
  }
  if (!raw.known) return { error: "unknown" };
  const profile = clean(raw);
  const updatedAt = new Date().toISOString();
  if (db) await db.from("uni_profiles").upsert({ key, name: ref.name, country: ref.country.toUpperCase(), lang, data: profile, updated_at: updatedAt });
  return { profile, cached: false, updatedAt };
}
