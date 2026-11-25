import { NextResponse } from "next/server";

// Ссылка-приглашение /r/<код>: запоминаем код на 30 дней и ведём на нужную страницу (по умолчанию — оценка профиля).
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  const dest = to && to.startsWith("/") && !to.startsWith("//") ? to : "/";
  const res = NextResponse.redirect(new URL(dest, url.origin), 307);
  if (/^[a-z0-9]{6,12}$/.test(code)) {
    res.cookies.set("uh_ref", code, { path: "/", maxAge: 30 * 86400, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }
  return res;
}
