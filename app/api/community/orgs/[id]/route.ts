import { NextResponse } from "next/server";
import { z } from "zod";
import type { Org } from "@/lib/community";
import { communityCtx, hasProfile, isResponse, needProfile, profilesFor } from "@/lib/server/community";

async function load(db: import("@supabase/supabase-js").SupabaseClient, id: string) {
  const { data } = await db.from("community_orgs").select("id,slug,name,kind,city,description,verified,owner_id,hidden").eq("id", id).maybeSingle();
  return data && !data.hidden ? data : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const org = await load(c.db, id);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: members } = await c.db.from("community_org_members").select("user_id,role").eq("org_id", id).order("joined_at");
  const people = await profilesFor(c.db, (members ?? []).map((m) => m.user_id));
  const isMember = (members ?? []).some((m) => m.user_id === c.user.id);
  const { data: chat } = await c.db.from("community_chats").select("id").eq("kind", "org").eq("org_id", id).maybeSingle();
  const item: Org = {
    id: org.id, slug: org.slug, name: org.name, kind: org.kind, city: org.city, description: org.description, verified: org.verified,
    members: members?.length ?? 0, isMember, isOwner: org.owner_id === c.user.id,
  };
  return NextResponse.json({
    org: item,
    chatId: isMember ? (chat?.id ?? null) : null,
    members: (members ?? []).map((m) => ({ role: m.role, profile: people.get(m.user_id) ?? null })).filter((m) => m.profile),
  });
}

const body = z.object({ action: z.enum(["join", "leave"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const org = await load(c.db, id);
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let { data: chat } = await c.db.from("community_chats").select("id").eq("kind", "org").eq("org_id", id).maybeSingle();
  if (!chat) chat = (await c.db.from("community_chats").insert({ kind: "org", org_id: id }).select("id").single()).data;

  if (parsed.data.action === "join") {
    if (!(await hasProfile(c.db, c.user.id))) return needProfile();
    await c.db.from("community_org_members").upsert({ org_id: id, user_id: c.user.id, role: org.owner_id === c.user.id ? "owner" : "member" }, { onConflict: "org_id,user_id" });
    if (chat) await c.db.from("community_chat_members").upsert({ chat_id: chat.id, user_id: c.user.id }, { onConflict: "chat_id,user_id" });
    return NextResponse.json({ ok: true, chatId: chat?.id ?? null });
  }
  if (org.owner_id === c.user.id) return NextResponse.json({ error: "owner", message: "Создатель не может выйти из своей организации." }, { status: 400 });
  await c.db.from("community_org_members").delete().eq("org_id", id).eq("user_id", c.user.id);
  if (chat) await c.db.from("community_chat_members").delete().eq("chat_id", chat.id).eq("user_id", c.user.id);
  return NextResponse.json({ ok: true });
}
