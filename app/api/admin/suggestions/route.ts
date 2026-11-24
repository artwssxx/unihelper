import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/server/adminAuth";
import { saveItem } from "@/lib/server/contentStore";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ items: null });
  const { data } = await db.from("uni_suggestions").select("id,data,status,created_at,admin_note").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ items: data ?? [] });
}

const body = z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]), data: z.record(z.string(), z.unknown()).optional(), note: z.string().max(300).optional() });

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { id, action, data, note } = parsed.data;
  if (action === "approve") {
    const { data: row } = await db.from("uni_suggestions").select("data").eq("id", id).single();
    const program = { ...(row?.data ?? {}), ...(data ?? {}), isCustom: false, aiDraft: false };
    const r = await saveItem("programs", program);
    if (!r.ok) return NextResponse.json({ error: "validation", message: r.error }, { status: 422 });
  }
  await db.from("uni_suggestions").update({ status: action === "approve" ? "approved" : "rejected", admin_note: note ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
