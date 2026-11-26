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
  // JSON (советы, разборы) и поток (чат AI Advisor) — проверяем оба: провайдер может уметь одно и не уметь другое.
  let t0 = Date.now();
  let json: { ok: boolean; ms: number; sample?: string | null; error?: string };
  try {
    const r = await p.json({ system: "Ты проверка связи.", user: "Верни {\"ok\": true} и переведи слово «привет» на узбекский в поле word.", schema: z.object({ ok: z.boolean(), word: z.string().optional() }), tier: "fast", maxTokens: 120, timeoutMs: 25_000 });
    json = { ok: r.ok, ms: Date.now() - t0, sample: r.word ?? null };
  } catch (e) {
    json = { ok: false, ms: Date.now() - t0, error: (e as Error).message.slice(0, 300) };
  }
  t0 = Date.now();
  let stream: typeof json;
  try {
    let text = "";
    for await (const t of p.stream({ system: "Отвечай одним коротким предложением.", messages: [{ role: "user", content: "Скажи «привет» по-узбекски." }], tier: "fast", maxTokens: 60, deadlineAt: Date.now() + 25_000 })) text += t;
    stream = text.trim() ? { ok: true, ms: Date.now() - t0, sample: text.trim().slice(0, 80) } : { ok: false, ms: Date.now() - t0, error: "пустой ответ" };
  } catch (e) {
    stream = { ok: false, ms: Date.now() - t0, error: (e as Error).message.slice(0, 300) };
  }
  return NextResponse.json({ ...json, ok: json.ok && stream.ok, error: json.error, stream });
}
