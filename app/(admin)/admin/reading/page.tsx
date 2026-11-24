"use client";

import { useCallback, useEffect, useState } from "react";

type Draft = { title: string; text: string; questions: { kind: "tfng" | "mcq" | "completion"; stem: string; choices?: string[]; answer: string }[]; checks: { generated: number; kept: number; dropped: string[] } };
type Item = { id: string; title: string; status: "auto" | "verified" | "rejected"; source: string; created_at: string; count: number };
const STATUS = { auto: "проверен автоматически", verified: "проверен преподавателем", rejected: "отклонён" } as const;
const KIND = { tfng: "T/F/NG", mcq: "Выбор ответа", completion: "Пропуск" } as const;

export default function AdminReading() {
  const [items, setItems] = useState<Item[] | null | undefined>(undefined);
  const [drafts, setDrafts] = useState<(Draft | null)[]>([null, null, null]);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; passages: { title: string; text: string }[]; questions: { id: string; stem: string; choices?: string[]; answer: string; skill: string }[] } | null>(null);

  const load = useCallback(() => fetch("/api/admin/reading", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items)), []);
  useEffect(() => {
    load();
  }, [load]);

  const [step, setStep] = useState<string>("");
  const call = async (payload: Record<string, unknown>) => {
    const r = await fetch("/api/admin/reading", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message ?? "Не получилось.");
    return j;
  };
  // Три коротких шага на текст: каждый укладывается в лимит одного запроса.
  async function gen(n: 1 | 2 | 3, avoid: string[] = drafts.filter(Boolean).map((d) => d!.title)): Promise<Draft | null> {
    setBusy(n);
    setMsg(null);
    try {
      setStep("пишем текст");
      const t = await call({ action: "text", n, avoid });
      setStep("пишем вопросы");
      const q = await call({ action: "questions", n, text: t.text });
      setStep("проверяем ответы");
      const v = await call({ action: "verify", title: t.title, text: t.text, raw: q.raw, dropped: q.dropped, generated: q.generated });
      setDrafts((d) => d.map((x, i) => (i === n - 1 ? v.draft : x)));
      return v.draft;
    } catch (e) {
      setMsg((e as Error).message);
      return null;
    } finally {
      setBusy(null);
      setStep("");
    }
  }
  async function genAll() {
    const titles = drafts.filter(Boolean).map((d) => d!.title);
    for (const n of [1, 2, 3] as const) {
      if (drafts[n - 1]) continue;
      const d = await gen(n, titles);
      if (!d) break;
      titles.push(d.title);
    }
  }
  async function save() {
    setMsg(null);
    const r = await fetch("/api/admin/reading", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", drafts }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.message ?? "Не сохранилось.");
    setMsg("Тест добавлен в пул: ученики получат его в следующей попытке.");
    setDrafts([null, null, null]);
    load();
  }
  async function setStatus(id: string, status: Item["status"]) {
    await fetch("/api/admin/reading", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "status", id, status }) });
    load();
  }
  async function open(id: string) {
    const j = await fetch(`/api/admin/reading?id=${id}`).then((r) => r.json());
    setPreview(j.test);
  }

  const total = drafts.reduce((s, d) => s + (d?.questions.length ?? 0), 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Тесты IELTS Reading</h1>
        <p className="mt-1 max-w-[780px] text-sm text-body">
          ИИ пишет оригинальный текст и вопросы, код проверяет цитаты и формат, второй проход ИИ решает вопросы без ответов — остаются только совпавшие. Каждый ученик получает тест, которого ещё не видел. Перед запуском откройте тест и отметьте «проверен преподавателем» или отклоните.
        </p>
      </div>
      {msg && <p className="rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-primary-ink">{msg}</p>}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Новый тест</h2>
          <button className="btn-primary" disabled={busy !== null} onClick={genAll}>{busy ? `Текст ${busy} из 3: ${step}…` : "Сгенерировать три текста"}</button>
        </div>
        <p className="text-xs text-muted">Каждый текст — около минуты: текст, вопросы, независимая проверка. Если в тексте осталось мало вопросов, сгенерируйте его заново.</p>
        <div className="grid gap-3 lg:grid-cols-3">
          {drafts.map((d, i) => (
            <div key={i} className="rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <b>Passage {i + 1}</b>
                <button className="text-sm font-bold text-primary" disabled={busy !== null} onClick={() => gen((i + 1) as 1 | 2 | 3)}>{d ? "Ещё раз" : "Создать"}</button>
              </div>
              {d ? (
                <div className="mt-2 space-y-2 text-sm">
                  <div className="font-bold">{d.title}</div>
                  <div className="text-muted">{d.text.split(/\s+/).length} слов · вопросов {d.checks.kept} из {d.checks.generated}</div>
                  {d.checks.dropped.length > 0 && (
                    <details><summary className="cursor-pointer text-xs font-bold text-muted">Отброшено проверкой: {d.checks.dropped.length}</summary><ul className="mt-1 list-disc pl-4 text-xs text-muted">{d.checks.dropped.map((x, k) => <li key={k}>{x}</li>)}</ul></details>
                  )}
                  <details><summary className="cursor-pointer text-xs font-bold text-primary">Текст и вопросы</summary>
                    <p className="mt-2 whitespace-pre-line text-xs text-body">{d.text}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">{d.questions.map((q, k) => <li key={k}>[{KIND[q.kind]}] {q.stem} — <b>{q.answer}</b></li>)}</ol>
                  </details>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">{busy === i + 1 ? `${step[0]?.toUpperCase() ?? ""}${step.slice(1)}…` : "Ещё не создан"}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={drafts.some((d) => !d) || total < 30} onClick={save}>Сохранить тест ({total} вопросов)</button>
          {drafts.every(Boolean) && total < 30 && <span className="text-sm text-red">Нужно не меньше 30 вопросов — перегенерируйте самый короткий текст.</span>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Пул тестов</h2>
        {items === undefined ? <p className="text-muted">Загрузка…</p> : items === null ? <p className="text-muted">Нужна база данных.</p> : items.length === 0 ? (
          <p className="text-muted">Пока пусто — ученики проходят тест из банка.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted"><tr><th className="px-5 py-3">Тест</th><th className="px-5 py-3">Вопросов</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3" /></tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-t border-line-3">
                    <td className="px-5 py-3"><div className="font-bold">{t.title}</div><div className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString("ru-RU")} · {t.source === "ai" ? "ИИ" : "человек"}</div></td>
                    <td className="px-5 py-3 tabular-nums">{t.count}</td>
                    <td className="px-5 py-3">{STATUS[t.status]}</td>
                    <td className="space-x-3 whitespace-nowrap px-5 py-3 text-right">
                      <button className="font-bold text-primary" onClick={() => open(t.id)}>Открыть</button>
                      {t.status !== "verified" && <button className="font-bold text-green" onClick={() => setStatus(t.id, "verified")}>Проверен</button>}
                      {t.status !== "rejected" && <button className="font-bold text-red" onClick={() => setStatus(t.id, "rejected")}>Отклонить</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(10,14,28,.5)]" onClick={() => setPreview(null)}>
          <div role="dialog" aria-modal className="h-full w-full max-w-[820px] space-y-4 overflow-y-auto bg-surface-solid p-6" onClick={(e) => e.stopPropagation()}>
            <button className="text-sm font-bold text-primary" onClick={() => setPreview(null)}>Закрыть</button>
            {preview.passages.map((p, i) => (
              <div key={i}><h3 className="text-lg font-extrabold">{p.title}</h3><p className="mt-2 whitespace-pre-line text-sm text-body">{p.text}</p></div>
            ))}
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {preview.questions.map((q) => <li key={q.id}><span className="text-muted">[{q.skill}]</span> {q.stem}{q.choices ? ` (${q.choices.join(" / ")})` : ""} — <b>{q.answer}</b></li>)}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
