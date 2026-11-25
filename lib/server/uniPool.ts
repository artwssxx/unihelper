import "server-only";
import { z } from "zod";
import { UNI_SEEDS } from "@/data/uniSeeds";
import type { Lang } from "@/lib/i18n/translate";
import type { Program } from "@/lib/types";
import type { UniProfile, UniRef } from "@/lib/uniProfile";
import { getContent } from "./contentStore";
import { llm } from "./llm";
import { supabaseAdmin } from "./supabase";
import { findInDirectory, uniNorm } from "./uniDirectory";
import { getUniProfile } from "./uniProfile";

// Подбор из общей базы: все собранные карточки вузов (uni_profiles) по странам ученика.
// Если по стране карточек мало, в фоне собираем ещё несколько — по списку вузов страны
// (стартовый data/uniSeeds.ts или список, который один раз собрал ИИ). Оценку ставит код на клиенте.

export const POOL_TARGET = 12; // сколько карточек на страну хотим иметь
const GROW_PER_CALL = 2;

export type PoolItem = { ref: UniRef; profile: UniProfile; updatedAt: string };

export async function poolFor(countries: string[], lang: Lang): Promise<{ items: PoolItem[]; counts: Record<string, number> }> {
  const db = supabaseAdmin();
  if (!db || !countries.length) return { items: [], counts: {} };
  const langs = lang === "ru" ? ["ru"] : [lang, "ru"];
  const { data } = await db.from("uni_profiles").select("name, country, lang, data, updated_at").in("country", countries).in("lang", langs).limit(600);
  const catalog = new Set(((await getContent("programs")) as Program[]).map((p) => uniNorm(p.university)));
  // Свой язык важнее русского; один вуз — один раз; вузы из проверенного каталога не дублируем.
  const best = new Map<string, PoolItem & { lang: string }>();
  for (const r of data ?? []) {
    const k = `${r.country}:${uniNorm(r.name)}`;
    if (catalog.has(uniNorm(r.name))) continue;
    const cur = best.get(k);
    if (!cur || (cur.lang !== lang && r.lang === lang)) {
      const prof = r.data as UniProfile;
      best.set(k, { ref: { name: r.name, country: r.country, web: prof.website ?? null }, profile: prof, updatedAt: r.updated_at, lang: r.lang });
    }
  }
  const items = [...best.values()].map(({ lang: _l, ...x }) => x); // eslint-disable-line @typescript-eslint/no-unused-vars
  const counts: Record<string, number> = {};
  for (const i of items) counts[i.ref.country] = (counts[i.ref.country] ?? 0) + 1;
  return { items, counts };
}

const TopList = z.object({ names: z.array(z.string()).describe("Официальные английские названия вузов") });

/** Список вузов страны для подбора: стартовый, из кеша или собранный ИИ один раз. */
async function topNames(country: string): Promise<string[]> {
  if (UNI_SEEDS[country]) return UNI_SEEDS[country];
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db.from("uni_country_tops").select("names").eq("country", country).maybeSingle();
  if (data) return data.names as string[];
  const m = llm();
  if (!m) return [];
  try {
    const r = await m.json({
      tier: "fast", schema: TopList, maxTokens: 1200, timeoutMs: 25_000,
      system: "Ты помогаешь школьникам из Узбекистана выбрать вузы за рубежом для бакалавриата. Называй только реально существующие вузы, без выдумок.",
      user: `Страна (ISO2): ${country}. Назови до 15 университетов этой страны, куда чаще всего поступают иностранные студенты на бакалавриат: с программами на английском, стипендиями или доступной стоимостью. Сначала самые известные. Только официальные названия на английском.`,
    });
    const names = [...new Set(r.names.map((n) => n.trim()).filter((n) => n.length > 3))].slice(0, 15);
    if (names.length) await db.from("uni_country_tops").upsert({ country, names, source: "ai", updated_at: new Date().toISOString() });
    return names;
  } catch {
    return [];
  }
}

const growing = new Set<string>();

/** Дособрать несколько карточек для стран, где их меньше POOL_TARGET. Вызывается в фоне (after). */
export async function growPool(countries: string[], counts: Record<string, number>, lang: Lang) {
  const need = countries.filter((c) => (counts[c] ?? 0) < POOL_TARGET && !growing.has(`${lang}:${c}`)).slice(0, 2);
  for (const c of need) {
    growing.add(`${lang}:${c}`);
    try {
      const db = supabaseAdmin();
      const have = new Set<string>();
      if (db) {
        const { data } = await db.from("uni_profiles").select("name").eq("country", c).eq("lang", lang);
        for (const r of data ?? []) have.add(uniNorm(r.name));
      }
      const catalog = new Set(((await getContent("programs")) as Program[]).filter((p) => p.country === c).map((p) => uniNorm(p.university)));
      const todo = (await topNames(c))
        .map((n) => findInDirectory(n, c) ?? { name: n, country: c, web: null })
        .filter((r) => !have.has(uniNorm(r.name)) && !catalog.has(uniNorm(r.name)))
        .slice(0, GROW_PER_CALL);
      for (const ref of todo) await getUniProfile(ref, lang, true);
    } finally {
      growing.delete(`${lang}:${c}`);
    }
  }
}
