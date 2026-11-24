import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, checkPassword, makeSession } from "@/lib/server/adminAuth";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  if (!takeQuota(clientKey(req) + ":adminlogin", 20).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!adminPassword()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (typeof body?.password !== "string" || !checkPassword(body.password)) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeSession(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
  return res;
}
