import { NextResponse } from "next/server";
import { isResponse } from "@/lib/server/community";
import { familyCtx, listParents, removeLink } from "@/lib/server/family";

// Ребёнок видит подключённых родителей и может отключить любого.
export async function GET(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  return NextResponse.json({ items: await listParents(c.db, c.user.id) });
}

export async function DELETE(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: await removeLink(c.db, c.user.id, id) });
}
