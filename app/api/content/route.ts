import { NextResponse } from "next/server";
import { getContent } from "@/lib/server/contentStore";

// Итоговый контент для сайта: значения из кода + правки из админки.
// Кеш на CDN Vercel на минуту (и до 10 минут отдаём прежнюю версию, пока обновляется): правки появятся максимум через минуту.
export async function GET() {
  const [programs, events, lessons] = await Promise.all([getContent("programs"), getContent("events"), getContent("lessons")]);
  return NextResponse.json({ programs, events, lessons }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=600" } });
}
