import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabase";

// Публикация сайта-портфолио. Нужен аккаунт. Хранится только публичный снимок.

const section = z.object({
  id: z.string().max(40),
  title: z.string().max(80),
  kind: z.enum(["text", "projects", "list", "links", "skills", "contact"]),
  text: z.string().max(2000).optional(),
  items: z.array(z.string().max(300)).max(30).optional(),
  projects: z.array(z.object({ title: z.string().max(120), text: z.string().max(600) })).max(12).optional(),
  links: z.array(z.object({ label: z.string().max(60), url: z.string().url().max(300).refine((u) => /^https?:\/\//i.test(u)) })).max(12).optional(),
});
const snapshot = z.object({
  name: z.string().min(1).max(80),
  headline: z.string().max(140),
  template: z.enum(["minimal", "creative", "academic", "bold", "night"]),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font: z.enum(["sans", "serif"]),
  hideBadge: z.boolean(),
  sections: z.array(section).max(20),
});
const body = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,30}$/, "адрес: 3–31 символ, латиница, цифры, дефис"),
  visibility: z.enum(["link", "public"]),
  parentConsent: z.boolean(),
  minor: z.boolean(),
  snapshot,
});

const RESERVED = new Set(["admin", "api", "login", "demo", "unihelper", "support", "help", "blog", "tg"]);

export async function GET(req: Request) {
  const user = await getUser(req);
  const db = supabaseAdmin();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await db.from("portfolio_sites").select("slug,visibility,link_token,published_at").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ site: data ?? null });
}

export async function PUT(req: Request) {
  if (!takeQuota(clientKey(req) + ":pfpublish", 30).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const user = await getUser(req);
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: parsed.error.issues[0]?.message }, { status: 400 });
  const { slug, visibility, parentConsent, minor, snapshot: snap } = parsed.data;
  if (RESERVED.has(slug)) return NextResponse.json({ error: "slug_taken", message: "Этот адрес занят" }, { status: 409 });
  if (minor && !parentConsent) return NextResponse.json({ error: "consent_required", message: "До 18 лет публикация — только с согласия родителя" }, { status: 400 });
  const { data: other } = await db.from("portfolio_sites").select("user_id").eq("slug", slug).maybeSingle();
  if (other && other.user_id !== user.id) return NextResponse.json({ error: "slug_taken", message: "Этот адрес уже занят — выберите другой" }, { status: 409 });
  const { data: mine } = await db.from("portfolio_sites").select("link_token").eq("user_id", user.id).maybeSingle();
  const token = mine?.link_token ?? randomBytes(9).toString("base64url");
  const now = new Date().toISOString();
  const { error } = await db.from("portfolio_sites").upsert(
    {
      user_id: user.id, slug, template: snap.template, visibility, content: snap, link_token: token,
      parent_consent_at: minor ? now : null, published_at: now, updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[portfolio]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  const path = visibility === "public" ? `/p/${slug}` : `/p/${slug}?k=${token}`;
  return NextResponse.json({ ok: true, path });
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  const db = supabaseAdmin();
  if (!user || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await db.from("portfolio_sites").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
