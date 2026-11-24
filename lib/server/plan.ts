import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { LIMITS, type Plan } from "@/lib/plans";
import { supabaseAdmin } from "./supabase";

// Тариф хранится в подписанной cookie «uh_plan» (её ставит сервер: тестовая активация Pro
// или вход в аккаунт с Pro в базе). Клиент подделать её не может.

export const PLAN_COOKIE = "uh_plan";
const secret = () => process.env.PLAN_SECRET || process.env.MOCK_SECRET || "unihelper-dev-plan-secret";

export function signPlan(plan: Plan, expiresAt: number): string {
  const body = `${plan}.${expiresAt}`;
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export function readPlanCookie(v: string | undefined): { plan: Plan; expiresAt: number } | null {
  if (!v) return null;
  const [plan, exp, mac] = v.split(".");
  if (!plan || !exp || !mac) return null;
  const expected = createHmac("sha256", secret()).update(`${plan}.${exp}`).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() || (plan !== "pro" && plan !== "free")) return null;
  return { plan: plan as Plan, expiresAt: Number(exp) };
}

function cookieFrom(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

export function planFromRequest(req: Request): Plan {
  return readPlanCookie(cookieFrom(req, PLAN_COOKIE))?.plan ?? "free";
}

export function limitsFor(req: Request) {
  return LIMITS[planFromRequest(req)];
}

/** Тестовая активация Pro разрешена, пока нет оплаты (выключить: TEST_PRO=off). */
export function testProAllowed(): boolean {
  return process.env.TEST_PRO !== "off";
}

export async function savePlanForUser(userId: string, plan: Plan, expiresAt: number | null, source: "test" | "paid" | null) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("user_state").upsert({ user_id: userId, plan, plan_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null, plan_source: source, updated_at: new Date().toISOString() });
}
