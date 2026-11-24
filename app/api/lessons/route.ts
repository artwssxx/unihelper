import { NextResponse } from "next/server";
import { z } from "zod";
import type { Lesson } from "@/lib/content/lessons";
import { getContent } from "@/lib/server/contentStore";
import { limitsFor } from "@/lib/server/plan";
import { getQuestion, isCorrect, toPublic } from "@/lib/mocks/engine";

// Мини-тест урока: вопросы без ответов, проверка — на сервере.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const l = ((await getContent("lessons")) as Lesson[]).find((x) => x.id === id);
  if (!l) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (l.isPro && !limitsFor(req).proLessons) return NextResponse.json({ error: "pro_required" }, { status: 402 });
  return NextResponse.json({ questions: l.quiz.map((q) => getQuestion(q)).filter(Boolean).map((q) => toPublic(q!)) });
}

const body = z.object({ id: z.string().max(40), answers: z.record(z.string(), z.string().max(200)) });
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const l = ((await getContent("lessons")) as Lesson[]).find((x) => x.id === parsed.data.id);
  if (!l) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (l.isPro && !limitsFor(req).proLessons) return NextResponse.json({ error: "pro_required" }, { status: 402 });
  const results = l.quiz.filter((qid) => getQuestion(qid)).map((qid) => {
    const q = getQuestion(qid)!;
    return { id: qid, correct: isCorrect(q, parsed.data.answers[qid]), answer: q.answer, explanation: q.explanation };
  });
  const score = results.length ? results.filter((r) => r.correct).length / results.length : 1;
  return NextResponse.json({ results, score });
}
