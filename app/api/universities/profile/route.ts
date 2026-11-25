import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { langOf } from "@/lib/server/replyLang";
import { getUniProfile } from "@/lib/server/uniProfile";

export const maxDuration = 60;

const q = z.object({ name: z.string().trim().min(2).max(200), country: z.string().regex(/^[A-Za-z]{2}$/), web: z.string().max(300).nullish() });

// Полная карточка вуза. Из кеша — всем; новую собирает ИИ: вошедшим до 40 в день, без входа (демо) — до 15.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const p = q.safeParse({ name: sp.get("name"), country: sp.get("country"), web: sp.get("web") });
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await getUser(req);
  const canGenerate = user ? takeQuota(clientKey(req, user.id) + ":uniprofile", 40).ok : takeQuota(clientKey(req) + ":uniprofile-anon", 15).ok;
  const r = await getUniProfile({ name: p.data.name, country: p.data.country.toUpperCase(), web: p.data.web ?? null }, langOf(req), canGenerate);
  if ("error" in r) return NextResponse.json(r, { status: r.error === "login_required" ? 401 : r.error === "unknown" ? 404 : 503 });
  return NextResponse.json(r, { headers: r.cached ? { "cache-control": "private, max-age=3600" } : {} });
}
