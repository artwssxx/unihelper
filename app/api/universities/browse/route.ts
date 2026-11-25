import { NextResponse } from "next/server";
import { browseUniversities, countryFacets, WORLD_TOTAL } from "@/lib/server/uniDirectory";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

// Каталог «Все вузы мира»: поиск, страна, страницы. Справочник открытый (Hipo, MIT), без требований и цен.
export async function GET(req: Request) {
  if (!takeQuota(clientKey(req) + ":unibrowse", 3000).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const country = sp.get("country")?.toUpperCase();
  const r = await browseUniversities({
    q: (sp.get("q") ?? "").slice(0, 80),
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
    page: Number(sp.get("page")) || 1,
    size: 24,
  });
  const facets = sp.get("facets") ? countryFacets() : undefined;
  return NextResponse.json({ ...r, totalWorld: WORLD_TOTAL, facets }, { headers: { "cache-control": "public, max-age=300" } });
}
