import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuestion, isCorrect } from "@/lib/mocks/engine";
import { verify } from "@/lib/mocks/token";

const body = z.object({ token: z.string().max(200_000), qid: z.string().max(40), answer: z.string().max(200).optional(), hint: z.boolean().optional() });

// Лёгкий режим: подсказка и разбор сразу после ответа. В хард-режиме недоступно.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const st = verify(parsed.data.token);
  if (!st || st.mode !== "light" || !st.qids.includes(parsed.data.qid)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = getQuestion(parsed.data.qid)!;
  if (parsed.data.hint) return NextResponse.json({ hint: q.hint ?? "Перечитайте условие и исключите заведомо неверные варианты." });
  return NextResponse.json({ correct: isCorrect(q, parsed.data.answer), answer: q.answer, accept: q.accept ?? [], explanation: q.explanation });
}
