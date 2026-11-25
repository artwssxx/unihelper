import { NextResponse } from "next/server";
import { z } from "zod";
import { profileSchema } from "@/lib/profileSchema";
import { isResponse } from "@/lib/server/community";
import { addByCode, addNew, familyCtx, listChildren, removeLink } from "@/lib/server/family";
import { clientKey, takeQuota } from "@/lib/server/rateLimit";

// Кабинет родителя: дети, добавление по коду ребёнка или регистрация с приглашением, удаление.
export async function GET(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  return NextResponse.json({ items: await listChildren(c.db, c.user.id) });
}

const body = z.union([
  z.object({ mode: z.literal("code"), code: z.string().trim().min(4).max(12) }),
  z.object({ mode: z.literal("new"), name: z.string().trim().min(1).max(60), profile: profileSchema }),
]);

export async function POST(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  if (!takeQuota(clientKey(req, c.user.id) + ":family", 20).ok) return NextResponse.json({ ok: false, message: "Слишком много попыток. Попробуйте через час." }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false, message: "Проверьте данные." }, { status: 400 });
  const r = p.data.mode === "code" ? await addByCode(c.db, c.user.id, p.data.code) : await addNew(c.db, c.user.id, p.data.name, p.data.profile);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}

export async function DELETE(req: Request) {
  const c = await familyCtx(req);
  if (isResponse(c)) return c;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: await removeLink(c.db, c.user.id, id) });
}
