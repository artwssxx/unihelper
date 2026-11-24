"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { lessonsForDomainsIn, useContent } from "@/lib/useContent";
import { DOMAIN_LABEL } from "@/lib/mocks/labels";
import { SECTION_TITLE, fmtTime, loadResult, type StoredResult, type WritingResult } from "@/lib/mocks/client";
import type { ReviewItem } from "@/lib/mocks/types";

const L = "ABCDEFGH";

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [r, setR] = useState<StoredResult | null | undefined>(undefined);
  const { lessons: LESSONS } = useContent();
  useEffect(() => setR(loadResult(id)), [id]);

  if (r === undefined) return null;
  if (!r) {
    return (
      <div className="card space-y-3 text-center">
        <p>Результат не найден на этом устройстве.</p>
        <Link href="/mocks" className="btn-primary">К мокам</Link>
      </div>
    );
  }
  if (r.kind === "writing") return <WritingResultView r={r.result} mode={r.mode} />;
  if (r.kind === "interrupted") {
    return (
      <div className="space-y-6">
        <div className="card space-y-3">
          <div className="eyebrow">ПОПЫТКА ПРЕРВАНА</div>
          <h1 className="text-3xl font-extrabold">{SECTION_TITLE[r.section]}</h1>
          <p className="text-body">В хард-режиме выход из полного экрана или смена вкладки завершает попытку. Балл не засчитан и в профиль не идёт.</p>
          <Link href="/mocks" className="btn-primary w-fit">Новая попытка</Link>
        </div>
        {r.review && <Review items={r.review} />}
      </div>
    );
  }

  const res = r.result;
  const lessons = lessonsForDomainsIn(LESSONS, res.weakDomains);
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap gap-6">
        <div className="min-w-0 flex-[1_1_300px] pt-2">
          <div className="eyebrow">РЕЗУЛЬТАТ МОКА</div>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight sm:text-[42px]">{SECTION_TITLE[res.section]}</h1>
          <p className="mt-3 text-body">
            {res.mode === "hard"
              ? "Хард-режим: балл добавлен в Profile Strength с пометкой «по моку». Для формальных требований вузов он не используется."
              : "Лёгкий режим: балл тренировочный и в профиль не идёт."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/mocks" className="btn-primary">Ещё один мок</Link>
            <Link href="/lessons" className="btn-secondary">Уроки</Link>
          </div>
        </div>
        <div className="relative min-w-0 flex-[1.4_1_420px] overflow-hidden rounded-[26px] bg-primary p-7 text-white">
          <div className="absolute -right-12 -top-12 h-[200px] w-[200px] rounded-full bg-white/10" aria-hidden />
          <span className="inline-block rounded-[10px] bg-white px-3 py-1.5 text-[13px] font-extrabold text-[#111834]">
            {res.exam === "sat" ? "Примерный балл секции" : "Примерный band"}
          </span>
          <div className="relative mt-4 text-[48px] font-extrabold tracking-tight">
            {res.exam === "sat" ? `≈ ${res.scoreLow}–${res.scoreHigh}` : `≈ ${res.band}`}
          </div>
          <p className="relative text-sm opacity-90">примерная оценка, не официальный балл</p>
          <div className="relative mt-5 grid grid-cols-3 gap-3 text-sm">
            <Stat label="Верно" value={`${res.raw.correct} / ${res.raw.total}`} />
            <Stat label="Время на вопрос" value={fmtTime(res.avgTimeSec)} />
            <Stat label={res.exam === "sat" ? "Модуль 2" : "Режим"} value={res.exam === "sat" ? (res.module2Path === "hard" ? "сложный" : "лёгкий") : res.mode === "hard" ? "хард" : "лёгкий"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="m-0 text-xl font-extrabold">Точность по темам</h2>
          <ul className="mt-4 space-y-3">
            {res.domains.map((d) => {
              const pct = Math.round((d.correct / d.total) * 100);
              return (
                <li key={d.domain}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{DOMAIN_LABEL[d.domain] ?? d.domain}</span>
                    <span className={pct < 60 ? "text-orange-ink" : "text-muted"}>{d.correct}/{d.total}</span>
                  </div>
                  <div className="mt-1.5 h-[7px] rounded-full bg-line">
                    <div className={`h-[7px] rounded-full ${pct < 60 ? "bg-orange" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card">
          <h2 className="m-0 text-xl font-extrabold">Что делать дальше</h2>
          <ol className="mt-4 space-y-3">
            {res.tips.map((t, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-ink">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          {lessons.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-extrabold text-muted">ТЕБЕ НУЖНЫ ЭТИ УРОКИ</h3>
              <div className="mt-3 flex flex-col gap-2">
                {lessons.map((l) => (
                  <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-bold hover:border-primary-mid">
                    {l.title}
                    <span className="text-muted">{l.minutes} мин</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Review items={res.review} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white/12 px-3 py-2.5" style={{ background: "rgba(255,255,255,.12)" }}>
      <div className="text-xs opacity-85">{label}</div>
      <div className="mt-0.5 font-extrabold">{value}</div>
    </div>
  );
}

function Review({ items }: { items: ReviewItem[] }) {
  const [filter, setFilter] = useState<"wrong" | "all">("wrong");
  const shown = filter === "wrong" ? items.filter((i) => !i.correct) : items;
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-extrabold">Разбор ответов</h2>
        <div className="flex rounded-xl bg-bg p-1 text-sm font-bold">
          {(["wrong", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 ${filter === f ? "bg-surface text-ink" : "text-muted"}`}>
              {f === "wrong" ? `Ошибки (${items.filter((i) => !i.correct).length})` : `Все (${items.length})`}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="mt-4 text-sm text-muted">Ошибок нет — отличная работа.</p>}
      <div className="mt-4 space-y-3">
        {shown.map((it, n) => (
          <details key={it.id} className="rounded-2xl border border-line p-4 open:bg-bg">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold">
                <span className={`mr-2 font-extrabold ${it.correct ? "text-green" : "text-red"}`}>{it.correct ? "✓" : "✗"}</span>
                {n + 1}. {it.stem.split("\n")[0].slice(0, 110)}
                {it.stem.length > 110 ? "…" : ""}
              </span>
              <span className="pill bg-bg text-muted">{DOMAIN_LABEL[it.domain] ?? it.domain} · {it.timeSec ? fmtTime(it.timeSec) : "—"}</span>
            </summary>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
              {it.passage && <p className="whitespace-pre-line text-body">{it.passage}</p>}
              <p className="whitespace-pre-line font-semibold">{it.stem}</p>
              {it.choices && (
                <ul className="space-y-1">
                  {it.choices.map((c, i) => (
                    <li key={i} className={L[i] === it.answer ? "font-bold text-green" : L[i] === it.given ? "text-red line-through" : ""}>
                      {L[i]}. {c}
                    </li>
                  ))}
                </ul>
              )}
              {!it.choices && (
                <p>
                  Ваш ответ: <b className={it.correct ? "text-green" : "text-red"}>{it.given || "—"}</b> · Правильный: <b className="text-green">{it.answer}</b>
                </p>
              )}
              <p className="rounded-xl bg-primary-soft px-4 py-3 text-primary-ink">{it.explanation}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function WritingResultView({ r, mode }: { r: WritingResult; mode: "light" | "hard" }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">IELTS WRITING · {mode === "hard" ? "ХАРД" : "ЛЁГКИЙ"} РЕЖИМ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight">Оценка Writing</h1>
        <p className="mt-2 text-body">Примерная оценка ИИ по 4 официальным критериям, диапазоном. Не официальный балл.</p>
      </div>
      {!r.ai && (
        <p className="rounded-2xl bg-orange-soft px-5 py-4 text-sm font-semibold text-orange-ink-2">
          {r.limit
            ? "Лимит ИИ-проверок Writing на сегодня исчерпан. Тексты сохранены — проверьте завтра."
            : "ИИ-оценка сейчас недоступна (не подключён ключ Claude API). Тексты сохранены, ниже — подсчёт слов."}
        </p>
      )}
      {(["task1", "task2"] as const).map((k) => {
        const ev = r[k];
        return (
          <section key={k} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-xl font-extrabold">{k === "task1" ? "Task 1" : "Task 2"}</h2>
              <span className={`pill ${r.counts[k] >= r.minWords[k] ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`}>
                {r.counts[k]} слов (минимум {r.minWords[k]})
              </span>
            </div>
            {ev ? (
              <>
                <div className="text-[36px] font-extrabold">band ≈ {ev.overallLow === ev.overallHigh ? ev.overallLow : `${ev.overallLow}–${ev.overallHigh}`}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {ev.criteria.map((c) => (
                    <div key={c.name} className="rounded-2xl border border-line p-4">
                      <div className="flex justify-between gap-2 font-bold">
                        <span>{c.name}</span>
                        <span className="text-primary-ink">{c.band}</span>
                      </div>
                      <p className="mt-2 text-sm text-body">{c.comment}</p>
                      {c.quotes.map((q, i) => (
                        <blockquote key={i} className="mt-2 border-l-0 rounded-lg bg-bg px-3 py-2 text-sm italic text-ink-2">«{q}»</blockquote>
                      ))}
                    </div>
                  ))}
                </div>
                <ol className="list-decimal space-y-1 pl-5 text-[15px]">
                  {ev.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </>
            ) : (
              <p className="text-sm text-muted">{r.texts?.[k]?.trim() ? "Оценки нет." : "Задание не выполнено."}</p>
            )}
            {r.texts?.[k] && (
              <details className="rounded-xl bg-bg p-4 text-sm">
                <summary className="cursor-pointer font-bold">Ваш текст</summary>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{r.texts[k]}</p>
              </details>
            )}
          </section>
        );
      })}
      <Link href="/mocks" className="btn-primary">К мокам</Link>
    </div>
  );
}
