import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanList, POST_KINDS, type Post } from "@/lib/community";
import { blockedSet, communityCtx, hasProfile, isResponse, needProfile, profilesFor } from "@/lib/server/community";
import { limitsFor } from "@/lib/server/plan";
import { takeQuota } from "@/lib/server/rateLimit";

export async function GET(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const kind = new URL(req.url).searchParams.get("kind");
  let q = c.db.from("community_posts").select("id,user_id,kind,title,body,roles,tags,status,created_at").eq("hidden", false).order("created_at", { ascending: false }).limit(80);
  if (kind && POST_KINDS.some((k) => k.id === kind)) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const blocked = await blockedSet(c.db, c.user.id);
  const rows = (data ?? []).filter((r) => !blocked.has(r.user_id));
  const people = await profilesFor(c.db, rows.map((r) => r.user_id));
  const items: Post[] = rows
    .map((r) => ({
      id: r.id, kind: r.kind, title: r.title, body: r.body, roles: r.roles, tags: r.tags, status: r.status, createdAt: r.created_at,
      author: people.get(r.user_id) ?? null, mine: r.user_id === c.user.id,
    }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "open" ? -1 : 1));
  return NextResponse.json({ items });
}

const body = z.object({
  kind: z.enum(["team", "study", "question"]),
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(1).max(2000),
  roles: z.array(z.string()).max(12).default([]),
  tags: z.array(z.string()).max(12).default([]),
});

export async function POST(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  if (!(await hasProfile(c.db, c.user.id))) return needProfile();
  if (!takeQuota(`id:${c.user.id}:posts`, 10).ok) return NextResponse.json({ error: "rate_limited", message: "Слишком много публикаций за день." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: "Заголовок от 4 символов и текст обязательны." }, { status: 400 });
  const limit = limitsFor(req).communityOpenPosts;
  const { count } = await c.db.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", c.user.id).eq("status", "open").eq("hidden", false);
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: "limit", message: `Открытых проектов может быть до ${limit}. Закрой старый или перейди на Pro.` }, { status: 402 });
  }
  const p = parsed.data;
  const { data, error } = await c.db
    .from("community_posts")
    .insert({ user_id: c.user.id, kind: p.kind, title: p.title, body: p.body, roles: cleanList(p.roles), tags: cleanList(p.tags) })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db", message: "Не удалось опубликовать." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
