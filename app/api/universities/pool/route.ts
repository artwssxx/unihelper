import { after, NextResponse } from "next/server";
import { isCountry } from "@/lib/countries";
import { getUser } from "@/lib/server/auth";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { langOf } from "@/lib/server/replyLang";
import { growPool, poolFor, POOL_TARGET } from "@/lib/server/uniPool";

export const maxDuration = 60;

// Общая база вузов для подбора: карточки по странам ученика. Мало карточек — для вошедших в фоне собираем ещё.
export async function GET(req: Request) {
  if (!takeQuota(clientKey(req) + ":unipool", 400).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const countries = [...new Set((new URL(req.url).searchParams.get("countries") ?? "").toUpperCase().split(",").filter(isCountry))].slice(0, 12);
  const lang = langOf(req);
  const { items, counts } = await poolFor(countries, lang);
  const user = await getUser(req);
  const short = countries.filter((c) => (counts[c] ?? 0) < POOL_TARGET);
  if (user && short.length && takeQuota(clientKey(req, user.id) + ":unipool-grow", 30).ok) after(() => growPool(short, counts, lang));
  return NextResponse.json({ items, counts, growing: Boolean(user && short.length) }, { headers: { "cache-control": "private, max-age=120" } });
}
