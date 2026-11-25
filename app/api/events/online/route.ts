import { NextResponse } from "next/server";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { onlineEvents } from "@/lib/server/onlineEvents";

// Онлайн-ивенты для автоподбора: хакатоны Devpost, соревнования Codeforces/CodeChef, онлайн-ивенты ленты.
// Подбор под профиль считается на клиенте (lib/onlineEvents.ts) — профиль на сервер не уходит.
export async function GET(req: Request) {
  if (!takeQuota(clientKey(req) + ":onlineevents", 300).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const r = await onlineEvents();
  return NextResponse.json(r, { headers: { "cache-control": "public, s-maxage=1800, stale-while-revalidate=10800" } });
}
