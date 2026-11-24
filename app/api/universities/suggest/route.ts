import { NextResponse } from "next/server";
import { programSchema } from "@/lib/content/schemas";
import { getUser } from "@/lib/server/auth";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";
import { supabaseAdmin } from "@/lib/server/supabase";

// Ученик предлагает свой вуз в общий каталог → очередь проверки в админке.
export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":unisuggest", 10).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const parsed = programSchema.safeParse((await req.json().catch(() => null))?.program);
  if (!parsed.success) return NextResponse.json({ error: "invalid", message: parsed.error.issues[0]?.message }, { status: 400 });
  const user = await getUser(req);
  const { error } = await db.from("uni_suggestions").insert({ user_id: user?.id ?? null, data: parsed.data });
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
