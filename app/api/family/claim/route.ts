import { NextResponse } from "next/server";
import { z } from "zod";
import { isResponse } from "@/lib/server/community";
import { claimInvite, familyCtx, inviteInfo } from "@/lib/server/family";
import { supabaseAdmin } from "@/lib/server/supabase";

const codeRe = /^[A-Z0-9]{10}$/;

// Приглашение от родителя: посмотреть (без входа) и принять (после входа ребёнка).
export async function GET(req: Request) {
  const db = supabaseAdmin();
  const invite = new URL(req.url).searchParams.get("code") ?? "";
  if (!db || !codeRe.test(invite)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const info = await inviteInfo(db, invite);
  return info ? NextResponse.json(info) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function POST(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  const p = z.object({ code: z.string().regex(codeRe) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, message: "Неверная ссылка." }, { status: 400 });
  const r = await claimInvite(c.db, c.user.id, p.data.code);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
