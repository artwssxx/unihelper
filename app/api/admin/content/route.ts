import { NextResponse } from "next/server";
import { z } from "zod";
import { CONTENT_KINDS, type ContentKind } from "@/lib/content/schemas";
import { isAdmin } from "@/lib/server/adminAuth";
import { deleteItem, listForAdmin, resetItem, saveItem, storageMode } from "@/lib/server/contentStore";

const kindSchema = z.enum(Object.keys(CONTENT_KINDS) as [ContentKind, ...ContentKind[]]);
const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const readonly = () => NextResponse.json({ error: "readonly", message: "Сохранение недоступно: подключите Supabase (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) и выполните миграцию 0003." }, { status: 503 });

export async function GET(req: Request) {
  if (!(await isAdmin())) return deny();
  const kind = kindSchema.safeParse(new URL(req.url).searchParams.get("kind"));
  if (!kind.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json({ items: await listForAdmin(kind.data), storage: storageMode() });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return deny();
  if (storageMode() === "readonly") return readonly();
  const body = await req.json().catch(() => null);
  const kind = kindSchema.safeParse(body?.kind);
  if (!kind.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const r = await saveItem(kind.data, body.data);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "validation", message: r.error }, { status: 422 });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return deny();
  if (storageMode() === "readonly") return readonly();
  const body = await req.json().catch(() => null);
  const kind = kindSchema.safeParse(body?.kind);
  if (!kind.success || typeof body?.id !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await deleteItem(kind.data, body.id);
  return NextResponse.json({ ok: true });
}

// Сбросить правку: вернуть значение из кода.
export async function POST(req: Request) {
  if (!(await isAdmin())) return deny();
  if (storageMode() === "readonly") return readonly();
  const body = await req.json().catch(() => null);
  const kind = kindSchema.safeParse(body?.kind);
  if (!kind.success || body?.action !== "reset" || typeof body?.id !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await resetItem(kind.data, body.id);
  return NextResponse.json({ ok: true });
}
