import { NextResponse } from "next/server";
import { checkin, coinCtx } from "@/lib/server/coins";
import { isResponse } from "@/lib/server/community";

// Ежедневный заход: один раз в сутки по Ташкенту, серия дней даёт бонусы.
export async function POST(req: Request) {
  const c = await coinCtx(req);
  if (isResponse(c)) return c;
  return NextResponse.json(await checkin(c.db, c.user.id));
}
