"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import * as I from "@/components/icons";
import { update, useStore } from "@/lib/clientStore";
import { COURSES, LESSONS } from "@/lib/content/lessons";
import type { PublicQuestion } from "@/lib/mocks/types";

const L = "ABCDEFGH";
type Res = { id: string; correct: boolean; answer: string; explanation: string };

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const lesson = LESSONS.find((l) => l.id === id);
  const store = useStore();
  const [qs, setQs] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{ results: Res[]; score: number } | null>(null);

  useEffect(() => {
    if (!lesson?.quiz.length) return;
    fetch(`/api/lessons?id=${lesson.id}`).then((r) => r.json()).then((j) => setQs(j.questions ?? []));
  }, [lesson]);

  if (!lesson) {
    return <div className="card">Урок не найден. <Link href="/lessons" className="font-bold text-primary">К урокам</Link></div>;
  }
  const course = COURSES.find((c) => c.id === lesson.courseId)!;
  const progress = store?.lessons?.[lesson.id];
  const idx = LESSONS.filter((l) => l.courseId === lesson.courseId).findIndex((l) => l.id === lesson.id);
  const next = LESSONS.filter((l) => l.courseId === lesson.courseId)[idx + 1];

  const setProgress = (patch: { watched?: boolean; quizScore?: number }) =>
    update((s) => ({ lessons: { ...(s.lessons ?? {}), [lesson.id]: { watched: false, ...(s.lessons?.[lesson.id] ?? {}), ...patch } } }));

  async function check() {
    const res = await fetch("/api/lessons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: lesson!.id, answers }) });
    const j = await res.json();
    setResults(j);
    setProgress({ quizScore: j.score });
  }

  const passed = progress?.watched && (progress.quizScore ?? (lesson.quiz.length ? 0 : 1)) >= 0.6;

  return (
    <div className="mx-auto max-w-[880px] space-y-6">
      <Link href="/lessons" className="text-sm font-bold text-primary">← {course.title}</Link>
      <div>
        <div className="eyebrow">{course.topic.toUpperCase()} · {lesson.minutes} МИН</div>
        <h1 className="mt-2 text-[32px] font-extrabold tracking-tight">{lesson.title}</h1>
      </div>

      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-[26px] bg-ink p-6 text-center text-white">
        <I.Play size={40} color="#F6B48E" />
        <p className="font-bold">Видео ментора скоро появится</p>
        <p className="max-w-sm text-sm text-navy-text">Пока — конспект урока ниже. {lesson.isPro ? "Полный курс будет доступен в Pro." : "Вводные уроки бесплатны."}</p>
      </div>

      <section className="card">
        <h2 className="m-0 text-xl font-extrabold">Конспект</h2>
        <ul className="mt-4 space-y-3">
          {lesson.summary.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-ink">{i + 1}</span>
              {s}
            </li>
          ))}
        </ul>
        <label className="mt-5 flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[#2E6BE6]" checked={Boolean(progress?.watched)} onChange={(e) => setProgress({ watched: e.target.checked })} />
          Конспект прочитан
        </label>
      </section>

      {qs.length > 0 && (
        <section className="card space-y-5">
          <h2 className="m-0 text-xl font-extrabold">Мини-тест</h2>
          {qs.map((q, n) => {
            const r = results?.results.find((x) => x.id === q.id);
            return (
              <div key={q.id} className="space-y-3">
                {q.passage && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body">{q.passage}</p>}
                <p className="whitespace-pre-line font-semibold">{n + 1}. {q.stem}</p>
                {q.choices ? (
                  <div className="grid gap-2">
                    {q.choices.map((c, i) => (
                      <button
                        key={i}
                        className="opt py-3 text-[15px]"
                        data-on={answers[q.id] === L[i] && !r}
                        data-state={r ? (L[i] === r.answer ? "correct" : answers[q.id] === L[i] ? "wrong" : undefined) : undefined}
                        onClick={() => !results && setAnswers({ ...answers, [q.id]: L[i] })}
                      >
                        <b>{L[i]}</b>{c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input className="input max-w-xs" aria-label={`Ответ на вопрос ${n + 1}`} disabled={Boolean(results)} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
                {r && <p className={`rounded-xl px-4 py-3 text-sm ${r.correct ? "bg-green-soft" : "bg-red-soft"}`}><b>{r.correct ? "Верно. " : `Неверно, ответ: ${r.answer}. `}</b>{r.explanation}</p>}
              </div>
            );
          })}
          {!results ? (
            <button className="btn-primary" onClick={check} disabled={Object.keys(answers).length < qs.length}>Проверить</button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-extrabold">{Math.round(results.score * 100)}%</span>
              <button className="btn-secondary" onClick={() => { setResults(null); setAnswers({}); }}>Пройти ещё раз</button>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`pill ${passed ? "bg-green-soft text-green" : "bg-bg text-muted"}`}>{passed ? "Урок засчитан" : "Урок засчитывается при прочитанном конспекте и тесте от 60%"}</span>
        {next && <Link href={`/lessons/${next.id}`} className="btn-primary">Следующий урок →</Link>}
      </div>
    </div>
  );
}
