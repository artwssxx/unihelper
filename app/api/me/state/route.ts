import { NextResponse } from "next/server";
import { getUser } from "@/lib/server/auth";
import { PLAN_COOKIE, signPlan } from "@/lib/server/plan";
import { supabaseAdmin } from "@/lib/server/supabase";

// Состояние ученика в аккаунте: профиль, история моков, прогресс, тариф.

function withPlanCookie(res: NextResponse, plan: string, expiresAt: string | null) {
  const exp = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 30 * 86400_000;
  if (plan === "pro" && exp > Date.now()) {
    res.cookies.set(PLAN_COOKIE, signPlan("pro", exp), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(exp) });
  }
  return res;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin()!;
  const { data } = await db.from("user_state").select("data,plan,plan_expires_at,plan_source,display_name,telegram_username").eq("user_id", user.id).maybeSingle();
  const plan = data?.plan === "pro" && (!data.plan_expires_at || new Date(data.plan_expires_at) > new Date()) ? "pro" : "free";
  const res = NextResponse.json({
    user, data: data?.data ?? {}, plan, planExpiresAt: data?.plan_expires_at ?? null, planSource: data?.plan_source ?? null,
  });
  return withPlanCookie(res, plan, data?.plan_expires_at ?? null);
}

export async function PUT(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 900_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: { data?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") return NextResponse.json({ error: "invalid" }, { status: 400 });
  // Демо-данные в аккаунт не сохраняем.
  if ((body.data as { demo?: { active?: boolean } }).demo?.active) return NextResponse.json({ ok: true, skipped: "demo" });
  const db = supabaseAdmin()!;
  const { error } = await db.from("user_state").upsert({ user_id: user.id, data: body.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  // Привязываем анкету, созданную до входа, к аккаунту.
  const profileId = (body.data as { profileId?: unknown }).profileId;
  if (typeof profileId === "string" && /^[0-9a-f-]{36}$/.test(profileId)) {
    await db.from("profiles").update({ auth_user_id: user.id }).eq("id", profileId).is("auth_user_id", null);
  }
  return NextResponse.json({ ok: true });
}
