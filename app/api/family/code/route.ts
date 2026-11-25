import { NextResponse } from "next/server";
import { isResponse } from "@/lib/server/community";
import { childCode, familyCtx } from "@/lib/server/family";

// Код ребёнка для родителей: ребёнок сам показывает его родителю (это и есть согласие).
export async function GET(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  return NextResponse.json({ code: await childCode(c.db, c.user.id) });
}
