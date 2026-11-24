import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/server/auth";
import { PLAN_COOKIE, planFromRequest, readPlanCookie, savePlanForUser, signPlan, testProAllowed } from "@/lib/server/plan";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)uh_plan=([^;]+)/)?.[1];
  const p = readPlanCookie(cookie ? decodeURIComponent(cookie) : undefined);
  return NextResponse.json({ plan: planFromRequest(req), expiresAt: p?.expiresAt ?? null, testAllowed: testProAllowed() });
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
