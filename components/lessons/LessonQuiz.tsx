"use client";

import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import type { PublicQuestion } from "@/lib/mocks/types";

const L = "ABCDEFGH";
type Res = { id: string; correct: boolean; answer: string; explanation: string };

/** Мини-тест урока: вопросы без ответов, проверка на сервере. Работает без регистрации. */
export default function LessonQuiz({ lessonId, onScore }: { lessonId: string; onScore?: (score: number) => void }) {
  const [qs, setQs] = useState<PublicQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{ results: Res[]; score: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/lessons?id=${encodeURIComponent(lessonId)}`)
      .then((r) => r.json())
      .then((j) => setQs(j.questions ?? []))
      .catch(() => setQs([]));
  }, [lessonId]);

  async function check() {
    setBusy(true);
    const res = await fetch("/api/lessons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: lessonId, answers }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return;
    const j = await res.json();
    setResults(j);
    track("lesson_quiz", { lesson: lessonId, score: Math.round(j.score * 100) });
    onScore?.(j.score);
  }

  if (qs === null) return <p className="text-muted">Загружаем вопросы…</p>;
  if (!qs.length) return null;
  const res = (id: string) => results?.results.find((r) => r.id === id);

  return (
    <div className="space-y-4">
      {qs.map((q, i) => {
        const r = res(q.id);
        return (
          <div key={q.id} className="card space-y-3">
            <div className="text-xs font-extrabold tracking-[0.14em] text-muted">ВОПРОС {i + 1}</div>
            {q.passage && <p className="whitespace-pre-line rounded-xl bg-line-3 px-4 py-3 text-[15px] text-body">{q.passage}</p>}
            <p className="whitespace-pre-line font-semibold">{q.stem}</p>
            {q.choices ? (
              <div className="grid gap-2">
                {q.choices.map((c, j) => {
                  const on = answers[q.id] === L[j];
                  const good = r && r.answer === L[j];
                  const bad = r && on && !r.correct;
                  return (
                    <button
                      key={j}
                      disabled={Boolean(results)}
                      onClick={() => setAnswers({ ...answers, [q.id]: L[j] })}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${good ? "border-green bg-green-soft" : bad ? "border-red bg-red-soft" : on ? "border-primary bg-primary-soft" : "border-line hover:border-primary"}`}
                    >
                      <span className="font-extrabold">{L[j]}</span>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input className="input max-w-[220px]" aria-label="Ответ" disabled={Boolean(results)} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Ответ" />
            )}
            {r && (
              <p className={`rounded-xl px-4 py-3 text-sm ${r.correct ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`}>
                <b>{r.correct ? "Верно." : `Правильный ответ: ${r.answer}.`}</b> {r.explanation}
              </p>
            )}
          </div>
        );
      })}
      {results ? (
        <p className="text-lg font-extrabold">Результат: {Math.round(results.score * qs.length)} из {qs.length}</p>
      ) : (
        <button className="btn-primary" disabled={busy || Object.keys(answers).length < qs.length} onClick={check}>{busy ? "Проверяем…" : "Проверить ответы"}</button>
      )}
    </div>
  );
}
