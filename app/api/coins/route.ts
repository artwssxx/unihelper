import { NextResponse } from "next/server";
import { applyReferral, coinCtx, coinState } from "@/lib/server/coins";
import { isResponse } from "@/lib/server/community";

// Кошелёк UniCoins: баланс, серия, задания, открытия. Заодно засчитывает приглашение (cookie uh_ref).
export async function GET(req: Request) {
  const c = await coinCtx(req);
  if (isResponse(c)) return c;
  const ref = req.headers.get("cookie")?.match(/(?:^|;\s*)uh_ref=([a-z0-9]{6,12})/)?.[1];
  let referral = false;
  if (ref) referral = await applyReferral(c.db, c.user.id, ref).catch(() => false);
  const res = NextResponse.json({ ...(await coinState(c.db, c.user.id)), referral });
  if (referral) res.cookies.set("uh_ref", "", { path: "/", maxAge: 0 });
  return res;
}
