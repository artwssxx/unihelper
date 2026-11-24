import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Вход в админку: пароль из ADMIN_PASSWORD, сессия — подписанная cookie на 12 часов.
// Локально (не production) без ADMIN_PASSWORD пароль по умолчанию — «admin».

export const ADMIN_COOKIE = "uh_admin";
const TTL_MS = 12 * 60 * 60 * 1000;

export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : "admin";
}

function secret(): string {
  return process.env.ADMIN_SECRET || process.env.MOCK_SECRET || "unihelper-dev-admin-secret";
}

const eq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkPassword(pw: string): boolean {
  const real = adminPassword();
  return Boolean(real) && eq(pw, real!);
}

export function makeSession(): string {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${createHmac("sha256", secret()).update(`admin:${exp}`).digest("base64url")}`;
}

export function validSession(v: string | undefined): boolean {
  if (!v) return false;
  const [exp, mac] = v.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return eq(mac, createHmac("sha256", secret()).update(`admin:${exp}`).digest("base64url"));
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return validSession(c.get(ADMIN_COOKIE)?.value);
}
