"use client";

import { useState } from "react";
import * as I from "@/components/icons";
import type { ActiveAttempt } from "@/lib/mocks/client";
import QuestionGrid from "./QuestionGrid";

const L = "ABCDEFGH";

type Check = { correct: boolean; answer: string; explanation: string };

export default function SatView(props: {
  a: ActiveAttempt;
  setAnswer: (qid: string, v: string) => void;
  goTo: (i: number) => void;
  toggleFlag: (qid: string) => void;
  onFinish: () => void;
}) {
  const { a } = props;
  const q = a.att.questions[a.cur];
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!q) return null;
  const given = a.answers[q.id] ?? "";
  const flagged = a.flags.includes(q.id);
  const light = a.mode === "light";
  const check = checks[q.id];
  const last = a.cur === a.att.questions.length - 1;

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/mocks/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: a.att.token, qid: q.id, ...body }),
      });
      return res.ok ? await res.json() : null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-[1180px] flex-wrap gap-7 px-4 pb-10 pt-8 sm:px-6">
      <section className="min-w-0 flex-[999_1_560px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-extrabold tracking-[0.08em] text-muted">
            ВОПРОС {a.cur + 1} ИЗ {a.att.questions.length}
          </span>
          <button
            onClick={() => props.toggleFlag(q.id)}
            aria-pressed={flagged}
            className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 py-2 text-sm font-bold text-ink"
          >
            <I.Flag />
            {flagged ? "Отмечено" : "Отметить"}
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-line bg-surface p-5 sm:p-8">
          {q.passage && (
            <p className="mb-6 whitespace-pre-line border-b border-line-3 pb-6 text-[17px] leading-[1.7] text-ink">{q.passage}</p>
          )}
          <p className="m-0 whitespace-pre-line text-[19px] font-semibold leading-[1.55] sm:text-[22px]">{q.stem}</p>

          {q.answerType === "mcq" ? (
            <div className="mt-7 flex flex-col gap-3" role="radiogroup" aria-label="Варианты ответа">
              {q.choices!.map((c, i) => {
                const letter = L[i];
                const state = check ? (letter === check.answer ? "correct" : letter === given ? "wrong" : undefined) : undefined;
                return (
                  <button
                    key={letter}
                    role="radio"
                    aria-checked={given === letter}
                    className="opt"
                    data-on={given === letter && !state}
                    data-state={state}
                    onClick={() => !check && props.setAnswer(q.id, letter)}
                  >
                    <b>{letter}</b>
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 max-w-xs">
              <label className="text-sm font-semibold text-muted" htmlFor={`spr-${q.id}`}>Введите ответ (число)</label>
              <input
                id={`spr-${q.id}`}
                className="input mt-2 text-lg font-bold"
                inputMode="decimal"
                autoComplete="off"
                value={given}
                disabled={Boolean(check)}
                onChange={(e) => props.setAnswer(q.id, e.target.value.replace(/[^0-9.,\-−/]/g, "").slice(0, 12))}
              />
              {check && (
                <p className={`mt-2 text-sm font-bold ${check.correct ? "text-green" : "text-red"}`}>
                  {check.correct ? "Верно" : `Правильный ответ: ${check.answer}`}
                </p>
              )}
            </div>
          )}

          {light && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {!check && (
                <button className="btn-secondary py-2.5 text-sm" disabled={busy || hints[q.id] != null} onClick={async () => {
                  const r = await call({ hint: true });
                  if (r?.hint) setHints({ ...hints, [q.id]: r.hint });
                }}>
                  Подсказка
                </button>
              )}
              {!check && (
                <button className="btn-primary py-2.5 text-sm" disabled={busy || !given} onClick={async () => {
                  const r = await call({ answer: given });
                  if (r) setChecks({ ...checks, [q.id]: r });
                }}>
                  Проверить ответ
                </button>
              )}
            </div>
          )}
          {hints[q.id] && !check && <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-ink"><b>Подсказка:</b> {hints[q.id]}</p>}
          {check && (
            <div className={`mt-5 rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${check.correct ? "bg-green-soft" : "bg-red-soft"}`}>
              <p className={`font-extrabold ${check.correct ? "text-green" : "text-red"}`}>{check.correct ? "Верно" : "Неверно"}</p>
              <p className="mt-1 text-ink">{check.explanation}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-between gap-3">
          <button className="btn-secondary" disabled={a.cur === 0} onClick={() => props.goTo(a.cur - 1)}>← Назад</button>
          {last ? (
            <button className="btn-primary" onClick={props.onFinish}>Завершить модуль</button>
          ) : (
            <button className="btn-primary" onClick={() => props.goTo(a.cur + 1)}>Далее →</button>
          )}
        </div>
      </section>

      <aside className="min-w-0 flex-[1_1_280px]">
        <QuestionGrid a={a} goTo={props.goTo} />
        <p className="mt-4 rounded-[18px] border border-dashed border-line-2 bg-bg p-4 text-[13px] leading-relaxed text-body">
          {a.exam === "sat" && a.att.module === 1
            ? "Чем лучше вы решите модуль 1, тем сложнее будет модуль 2 — и тем выше потолок балла."
            : "Не оставляйте вопросы пустыми: за неверный ответ баллы не снимаются."}
        </p>
      </aside>
    </main>
  );
}
