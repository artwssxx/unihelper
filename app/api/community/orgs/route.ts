import { NextResponse } from "next/server";
import { z } from "zod";
import { slugifyOrg, type Org } from "@/lib/community";
import { communityCtx, hasProfile, isResponse, needProfile } from "@/lib/server/community";
import { limitsFor } from "@/lib/server/plan";
import { takeQuota } from "@/lib/server/rateLimit";

type OrgRow = { id: string; slug: string; name: string; kind: Org["kind"]; city: string | null; description: string; verified: boolean; owner_id: string | null };

export async function GET(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { data, error } = await c.db.from("community_orgs").select("id,slug,name,kind,city,description,verified,owner_id").eq("hidden", false).order("verified", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  const rows = (data ?? []) as OrgRow[];
  const ids = rows.map((r) => r.id);
  const { data: members } = ids.length ? await c.db.from("community_org_members").select("org_id,user_id").in("org_id", ids) : { data: [] };
  const items: Org[] = rows.map((r) => {
    const m = (members ?? []).filter((x) => x.org_id === r.id);
    return {
      id: r.id, slug: r.slug, name: r.name, kind: r.kind, city: r.city, description: r.description, verified: r.verified,
      members: m.length, isMember: m.some((x) => x.user_id === c.user.id), isOwner: r.owner_id === c.user.id,
    };
  });
  return NextResponse.json({ items });
}

const body = z.object({
  name: z.string().trim().min(3).max(80),
  kind: z.enum(["club", "olympiad", "volunteer", "startup", "media", "other"]),
  city: z.string().trim().max(60).nullable(),
  description: z.string().trim().min(10).max(1500),
});

export async function POST(req: Request) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  if (!(await hasProfile(c.db, c.user.id))) return needProfile();
  if (!takeQuota(`id:${c.user.id}:orgs`, 5).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: "Название от 3 символов и описание от 10 символов." }, { status: 400 });
  const limit = limitsFor(req).communityOrgs;
  const { count } = await c.db.from("community_orgs").select("id", { count: "exact", head: true }).eq("owner_id", c.user.id);
  if ((count ?? 0) >= limit) return NextResponse.json({ error: "limit", message: `Можно создать до ${limit} организаций на вашем тарифе.` }, { status: 402 });

  const p = parsed.data;
  const base = slugifyOrg(p.name);
  let slug = base;
  for (let i = 2; i < 20; i++) {
    const { data: taken } = await c.db.from("community_orgs").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base.slice(0, 34)}-${i}`;
  }
  const { data: org, error } = await c.db
    .from("community_orgs")
    .insert({ slug, name: p.name, kind: p.kind, city: p.city || null, description: p.description, owner_id: c.user.id })
    .select("id")
    .single();
  if (error || !org) return NextResponse.json({ error: "db", message: "Не удалось создать организацию." }, { status: 500 });
  await c.db.from("community_org_members").insert({ org_id: org.id, user_id: c.user.id, role: "owner" });
  const { data: chat } = await c.db.from("community_chats").insert({ kind: "org", org_id: org.id }).select("id").single();
  if (chat) await c.db.from("community_chat_members").insert({ chat_id: chat.id, user_id: c.user.id });
  return NextResponse.json({ ok: true, id: org.id, slug });
}
