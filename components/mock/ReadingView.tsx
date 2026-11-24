"use client";

import type { ActiveAttempt } from "@/lib/mocks/client";
import PassageMarker from "./PassageMarker";

const L = "ABCDEFGH";

// Как на компьютерном IELTS: текст слева, вопросы справа.
export default function ReadingView(props: {
  a: ActiveAttempt;
  setAnswer: (qid: string, v: string) => void;
  goTo: (i: number) => void;
  toggleFlag: (qid: string) => void;
}) {
  const { a } = props;
  const passages = a.att.passages ?? [];
  const curQ = a.att.questions[a.cur];
  const pid = curQ?.passageId ?? passages[0]?.id;
  const passage = passages.find((p) => p.id === pid) ?? passages[0];
  const qs = a.att.questions.map((q, i) => ({ q, i })).filter(({ q }) => q.passageId === passage?.id);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-5 sm:px-6">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Тексты">
        {passages.map((p, idx) => {
          const first = a.att.questions.findIndex((q) => q.passageId === p.id);
          const on = p.id === passage?.id;
          const cnt = a.att.questions.filter((q) => q.passageId === p.id);
          const ans = cnt.filter((q) => (a.answers[q.id] ?? "") !== "").length;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={on}
              onClick={() => props.goTo(first)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${on ? "bg-primary text-white" : "border border-line bg-surface text-ink"}`}
            >
              Passage {idx + 1} · {ans}/{cnt.length}
            </button>
          );
        })}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-line bg-surface p-6 lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">{passage?.title}</h2>
            <span className="text-xs text-muted">Выдели текст — можно подсветить, подчеркнуть или оставить заметку</span>
          </div>
          {passage && <PassageMarker attemptId={a.att.attemptId} passageId={passage.id} text={passage.text} />}
        </article>
        <section className="space-y-4 lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto lg:pr-1">
          {qs.map(({ q, i }) => {
            const given = a.answers[q.id] ?? "";
            const flagged = a.flags.includes(q.id);
            return (
              <div key={q.id} className="space-y-3">
                {q.group && <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-ink">{q.group}</p>}
                <div
                  className={`rounded-2xl border bg-surface p-4 ${i === a.cur ? "border-primary" : "border-line"}`}
                  onFocus={() => i !== a.cur && props.goTo(i)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold leading-relaxed">
                      <span className="mr-2 font-extrabold text-primary">{i + 1}.</span>
                      {q.stem}
                    </p>
                    <button
                      onClick={() => props.toggleFlag(q.id)}
                      aria-pressed={flagged}
                      aria-label={`Отметить вопрос ${i + 1}`}
                      className={`flex-none rounded-lg border px-2 py-1 text-xs font-bold ${flagged ? "border-orange bg-orange-soft text-orange-ink" : "border-line text-muted"}`}
                    >
                      {flagged ? "Отмечен" : "Флаг"}
                    </button>
                  </div>
                  {q.answerType === "mcq" ? (
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Ответ на вопрос ${i + 1}`}>
                      {q.choices!.map((c, ci) => (
                        <button
                          key={c}
                          role="radio"
                          aria-checked={given === L[ci]}
                          onClick={() => props.setAnswer(q.id, L[ci])}
                          className={`rounded-xl border-[1.5px] px-3 py-2 text-left text-sm font-semibold ${
                            given === L[ci] ? "border-primary bg-primary-soft text-primary-ink" : "border-line bg-surface hover:border-primary-mid"
                          } ${q.choices!.length > 4 ? "w-full" : ""}`}
                        >
                          {q.choices!.length > 4 || c.length > 16 ? `${L[ci]}. ${c}` : c}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="input mt-3"
                      placeholder="Ваш ответ"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`Ответ на вопрос ${i + 1}`}
                      value={given}
                      onChange={(e) => props.setAnswer(q.id, e.target.value.slice(0, 60))}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5" aria-label="Навигация по вопросам">
        {a.att.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => props.goTo(i)}
            aria-label={`Вопрос ${i + 1}`}
            className={`h-9 w-9 rounded-lg border text-xs font-bold ${
              i === a.cur ? "border-primary bg-primary text-white" : (a.answers[q.id] ?? "") !== "" ? "border-primary-soft-2 bg-primary-soft text-primary-ink" : "border-line bg-surface"
            }`}
            style={a.flags.includes(q.id) ? { boxShadow: "inset 0 -3px 0 #E8652B" } : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </main>
  );
}
