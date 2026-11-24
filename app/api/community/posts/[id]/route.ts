import { NextResponse } from "next/server";
import { z } from "zod";
import { communityCtx, isResponse } from "@/lib/server/community";

const body = z.object({ status: z.enum(["open", "closed"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { data } = await c.db.from("community_posts").update({ status: parsed.data.status }).eq("id", id).eq("user_id", c.user.id).select("id");
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await communityCtx(req);
  if (isResponse(c)) return c;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { data } = await c.db.from("community_posts").delete().eq("id", id).eq("user_id", c.user.id).select("id");
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
