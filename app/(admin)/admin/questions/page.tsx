"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/mocks/types";

const L = "ABCDEFGH";

export default function AdminQuestions() {
  const [section, setSection] = useState<"math" | "rw" | "reading">("math");
  const [difficulty, setDifficulty] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; items: Question[] } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      fetch(`/api/admin/questions?section=${section}&difficulty=${difficulty}&q=${encodeURIComponent(q)}&page=${page}`, { cache: "no-store" })
        .then((r) => r.json()).then(setData);
    }, 200);
    return () => clearTimeout(id);
  }, [section, difficulty, q, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Банк вопросов</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">
          SAT Math генерируется из шаблонов (ответ считает код), SAT RW и IELTS написаны вручную. Здесь — просмотр с ответами для вычитки. Редактирование и скрытие вопросов — следующий шаг админки.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" aria-label="Секция" value={section} onChange={(e) => { setSection(e.target.value as typeof section); setPage(0); }}>
          <option value="math">SAT Math</option><option value="rw">SAT Reading & Writing</option><option value="reading">IELTS Reading</option>
        </select>
        <select className="input w-auto" aria-label="Сложность" value={difficulty} onChange={(e) => { setDifficulty(Number(e.target.value)); setPage(0); }}>
          <option value={0}>Любая сложность</option><option value={1}>Лёгкие</option><option value={2}>Средние</option><option value={3}>Сложные</option>
        </select>
        <input className="input max-w-xs" placeholder="Поиск по тексту и навыку" aria-label="Поиск" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      </div>
      {data && <p className="text-sm text-muted">Найдено: {data.total}</p>}
      <div className="space-y-3">
        {data?.items.map((x) => (
          <details key={x.id} className="card p-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{x.stem.split("\n")[0].slice(0, 120)}</span>
              <span className="pill bg-line-3 text-muted">{x.id} · {x.skill} · ур. {x.difficulty}</span>
            </summary>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
              {x.passage && <p className="whitespace-pre-line text-body">{x.passage}</p>}
              <p className="whitespace-pre-line font-semibold">{x.stem}</p>
              {x.choices && <ul>{x.choices.map((c, i) => <li key={i} className={L[i] === x.answer ? "font-bold text-green" : ""}>{L[i]}. {c}</li>)}</ul>}
              {!x.choices && <p>Ответ: <b className="text-green">{x.answer}</b>{x.accept?.length ? ` (также: ${x.accept.join(", ")})` : ""}</p>}
              <p className="rounded-xl bg-primary-soft px-4 py-3 text-primary-ink">{x.explanation}</p>
              <p className="text-xs text-muted">Источник: {x.source === "code" ? "шаблон + проверка кодом" : "написан вручную"}</p>
            </div>
          </details>
        ))}
      </div>
      {data && data.total > 30 && (
        <div className="flex items-center gap-3">
          <button className="btn-secondary py-2" disabled={page === 0} onClick={() => setPage(page - 1)}>Назад</button>
          <span className="text-sm text-muted">стр. {page + 1} из {Math.ceil(data.total / 30)}</span>
          <button className="btn-secondary py-2" disabled={(page + 1) * 30 >= data.total} onClick={() => setPage(page + 1)}>Далее</button>
        </div>
      )}
    </div>
  );
}
