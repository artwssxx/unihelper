import { NextResponse } from "next/server";
import { searchUniversities } from "@/lib/server/uniDirectory";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

export async function GET(req: Request) {
  if (!takeQuota(clientKey(req) + ":unisearch", 2000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const country = sp.get("country")?.toUpperCase();
  const items = await searchUniversities(q, country && /^[A-Z]{2}$/.test(country) ? country : undefined);
  return NextResponse.json({ items }, { headers: { "cache-control": "public, max-age=300" } });
}
