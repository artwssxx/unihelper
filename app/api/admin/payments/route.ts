import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/server/adminAuth";
import { supabaseAdmin } from "@/lib/server/supabase";

const idSchema = z.string().uuid();
const reviewSchema = z.object({ id: idSchema, approve: z.boolean() });
const size = 30;

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const params = new URL(req.url).searchParams;
  const receiptId = params.get("receipt");
  if (receiptId !== null) {
    if (!idSchema.safeParse(receiptId).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data, error } = await db.from("pro_launch_payments").select("receipt,receipt_type").eq("id", receiptId).maybeSingle();
    if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return new Response(new Uint8Array(Buffer.from(data.receipt, "base64")), {
      headers: { "Content-Type": data.receipt_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
    });
  }

  const page = Number(params.get("page") ?? "0");
  if (!Number.isSafeInteger(page) || page < 0 || page > 100_000) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const [items, pending, approved] = await Promise.all([
    db.from("pro_launch_payments").select("id,user_id,status,amount,created_at", { count: "exact" })
      .order("created_at", { ascending: false }).order("id").range(page * size, (page + 1) * size - 1),
    db.from("pro_launch_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("pro_launch_payments").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);
  if (items.error || pending.error || approved.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({
    items: items.data,
    pending: pending.count,
    approved: approved.count,
    totalSum: (approved.count ?? 0) * 30_000,
    hasMore: (items.count ?? 0) > (page + 1) * size,
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await db.rpc("review_pro_launch_payment", { payment_id: parsed.data.id, approve: parsed.data.approve });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "not_pending" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
