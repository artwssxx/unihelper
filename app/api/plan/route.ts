import { NextResponse } from "next/server";
import { z } from "zod";
import { launchAccessUntil } from "@/lib/server/proLaunch";
import { getUser } from "@/lib/server/auth";
import { PAID_PLAN_COOKIE, PLAN_COOKIE, readPlanCookie, savePlanForUser, signPlan, testProAllowed } from "@/lib/server/plan";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)uh_plan=([^;]+)/)?.[1];
  const p = readPlanCookie(cookie ? decodeURIComponent(cookie) : undefined);
  const user = await getUser(req);
  const accessUntil = user ? await launchAccessUntil(user.id).catch(() => null) : null;
  const expiresAt = accessUntil ? Math.max(accessUntil, p?.plan === "pro" ? p.expiresAt : 0) : p?.expiresAt ?? null;
  const res = NextResponse.json({
    plan: accessUntil ? "pro" : p?.plan ?? "free",
    expiresAt,
    earlyAccessUntil: accessUntil,
    testAllowed: testProAllowed(),
  });
  if (accessUntil) {
    res.cookies.set(PAID_PLAN_COOKIE, signPlan("pro", accessUntil), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(accessUntil) });
  } else if (req.headers.get("cookie")?.includes(PAID_PLAN_COOKIE + "=")) {
    res.cookies.set(PAID_PLAN_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}

const body = z.object({ action: z.enum(["activate-test", "cancel"]) });

// Тестовая активация Pro: пока нет оплаты (Click / Payme), Pro включается на 30 дней бесплатно.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await getUser(req);
  const res = NextResponse.json({ ok: true });
  if (parsed.data.action === "activate-test") {
    if (!testProAllowed()) return NextResponse.json({ error: "test_disabled" }, { status: 403 });
    const exp = Date.now() + 30 * 86400_000;
    res.cookies.set(PLAN_COOKIE, signPlan("pro", exp), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(exp) });
    if (user) await savePlanForUser(user.id, "pro", exp, "test");
  } else {
    res.cookies.set(PLAN_COOKIE, "", { path: "/", maxAge: 0 });
    if (user) await savePlanForUser(user.id, "free", null, null);
  }
  return res;
}
