import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/server/adminAuth";
import { supabaseAdmin } from "@/lib/server/supabase";

type Target = { type: "post" | "message" | "profile" | "org"; id: string };

async function preview(db: NonNullable<ReturnType<typeof supabaseAdmin>>, t: Target): Promise<{ text: string; hidden: boolean } | null> {
  if (t.type === "post") {
    const { data } = await db.from("community_posts").select("title,body,hidden").eq("id", t.id).maybeSingle();
    return data ? { text: `${data.title}\n${data.body}`, hidden: data.hidden } : null;
  }
  if (t.type === "message") {
    const { data } = await db.from("community_messages").select("body,hidden").eq("id", Number(t.id)).maybeSingle();
    return data ? { text: data.body, hidden: data.hidden } : null;
  }
  if (t.type === "profile") {
    const { data } = await db.from("community_profiles").select("display_name,bio,looking_for,hidden_by_admin").eq("user_id", t.id).maybeSingle();
    return data ? { text: `${data.display_name}\n${data.bio}\n${data.looking_for}`, hidden: data.hidden_by_admin } : null;
  }
  const { data } = await db.from("community_orgs").select("name,description,hidden").eq("id", t.id).maybeSingle();
  return data ? { text: `${data.name}\n${data.description}`, hidden: data.hidden } : null;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ reports: null, orgs: null });
  const { data: reports } = await db.from("community_reports").select("id,target_type,target_id,reason,status,created_at").order("created_at", { ascending: false }).limit(100);
  const withPreview = await Promise.all(
    (reports ?? []).map(async (r) => ({ ...r, target: await preview(db, { type: r.target_type, id: r.target_id }) })),
  );
  const { data: orgs } = await db.from("community_orgs").select("id,slug,name,kind,city,description,verified,hidden,created_at").order("created_at", { ascending: false }).limit(100);
  const [{ count: people }, { count: posts }, { count: messages }] = await Promise.all([
    db.from("community_profiles").select("user_id", { count: "exact", head: true }),
    db.from("community_posts").select("id", { count: "exact", head: true }),
    db.from("community_messages").select("id", { count: "exact", head: true }),
  ]);
  return NextResponse.json({ reports: withPreview, orgs: orgs ?? [], stats: { people: people ?? 0, posts: posts ?? 0, messages: messages ?? 0 } });
}

const body = z.union([
  z.object({ reportId: z.string().uuid(), action: z.enum(["hide", "dismiss", "restore"]) }),
  z.object({ orgId: z.string().uuid(), action: z.enum(["verify", "unverify", "hide-org", "show-org"]) }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const p = parsed.data;
  const now = new Date().toISOString();

  if ("orgId" in p) {
    const patch = p.action === "verify" ? { verified: true } : p.action === "unverify" ? { verified: false } : { hidden: p.action === "hide-org" };
    await db.from("community_orgs").update(patch).eq("id", p.orgId);
    return NextResponse.json({ ok: true });
  }

  const { data: r } = await db.from("community_reports").select("target_type,target_id").eq("id", p.reportId).maybeSingle();
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (p.action !== "dismiss") {
    const hide = p.action === "hide";
    if (r.target_type === "post") await db.from("community_posts").update({ hidden: hide }).eq("id", r.target_id);
    if (r.target_type === "message") await db.from("community_messages").update({ hidden: hide }).eq("id", Number(r.target_id));
    if (r.target_type === "profile") await db.from("community_profiles").update({ hidden_by_admin: hide }).eq("user_id", r.target_id);
    if (r.target_type === "org") await db.from("community_orgs").update({ hidden: hide }).eq("id", r.target_id);
  }
  await db.from("community_reports").update({ status: p.action === "dismiss" ? "dismissed" : p.action === "hide" ? "resolved" : "open", reviewed_at: now }).eq("id", p.reportId);
  return NextResponse.json({ ok: true });
}
