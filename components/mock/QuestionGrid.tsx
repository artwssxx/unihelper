"use client";

import type { ActiveAttempt } from "@/lib/mocks/client";

// Сетка вопросов модуля — как в макете mock-hard.
export default function QuestionGrid({ a, goTo }: { a: ActiveAttempt; goTo: (i: number) => void }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <div className="font-extrabold">Вопросы {a.exam === "sat" ? "модуля" : "теста"}</div>
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,40px)] gap-2">
        {a.att.questions.map((q, i) => {
          const done = (a.answers[q.id] ?? "") !== "";
          const cur = i === a.cur;
          const flag = a.flags.includes(q.id);
          return (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              aria-label={`Вопрос ${i + 1}${done ? ", отвечено" : ""}${flag ? ", отмечено" : ""}`}
              aria-current={cur ? "step" : undefined}
              className={`h-10 w-10 rounded-[10px] border text-sm font-bold ${
                cur ? "border-primary bg-primary text-white" : done ? "border-primary-soft-2 bg-primary-soft text-primary-ink" : "border-line bg-surface text-ink"
              }`}
              style={flag ? { boxShadow: "inset 0 -3px 0 #E8652B" } : undefined}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-col gap-2 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-primary-soft-2 bg-primary-soft" />Отвечено
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-line bg-surface" style={{ boxShadow: "inset 0 -3px 0 #E8652B" }} />
          Отмечено на проверку
        </span>
      </div>
      {a.exam === "sat" && (
        <p className="mt-5 text-[13px] leading-relaxed text-muted">
          Внутри модуля можно вернуться к любому вопросу.{a.att.module > 1 ? " К модулю 1 вернуться нельзя." : ""}
        </p>
      )}
    </div>
  );
}
