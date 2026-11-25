import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/server/adminAuth";
import { llm, providerByName, providerNames } from "@/lib/server/llm";

export const maxDuration = 60;

// Админка: какие ИИ подключены (по переменным окружения, без ключей) и короткая проверка каждого.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ providers: providerNames(), chain: llm()?.name ?? null });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const name = String((await req.json().catch(() => ({})))?.name ?? "");
  const p = providerByName(name);
  if (!p) return NextResponse.json({ ok: false, error: "не настроен" });
  const t0 = Date.now();
  try {
    const r = await p.json({ system: "Ты проверка связи.", user: "Верни {\"ok\": true, \"lang\": \"uz\"} и переведи слово «привет» на узбекский в поле word.", schema: z.object({ ok: z.boolean(), word: z.string().optional() }), tier: "fast", maxTokens: 120, timeoutMs: 25_000 });
    return NextResponse.json({ ok: r.ok, ms: Date.now() - t0, sample: r.word ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, ms: Date.now() - t0, error: (e as Error).message.slice(0, 300) });
  }
}
