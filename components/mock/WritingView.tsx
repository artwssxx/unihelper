"use client";

import { useState } from "react";
import type { ActiveAttempt } from "@/lib/mocks/client";

const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

export default function WritingView(props: { a: ActiveAttempt; setEssay: (t: "task1" | "task2", v: string) => void; hard: boolean }) {
  const w = props.a.att.writing!;
  const [tab, setTab] = useState<"task1" | "task2">("task1");
  const task = w[tab];
  const text = props.a.essays?.[tab] ?? "";
  const n = words(text);

  return (
    <main className="mx-auto max-w-[1300px] px-4 pb-10 pt-5 sm:px-6">
      <div className="mb-4 flex gap-2" role="tablist">
        {(["task1", "task2"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === k ? "bg-primary text-white" : "border border-line bg-surface"}`}
          >
            {w[k].title} · {words(props.a.essays?.[k] ?? "")} слов
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-line bg-surface p-6">
          <p className="text-sm font-bold text-muted">Рекомендуемое время: {task.minutes} мин · минимум {task.minWords} слов</p>
          <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.7]">{task.prompt}</p>
          {tab === "task1" && <BarChart chart={w.task1.chart} />}
        </article>
        <div className="flex flex-col">
          <label htmlFor={`essay-${tab}`} className="sr-only">Ваш ответ на {task.title}</label>
          <textarea
            id={`essay-${tab}`}
            className="input min-h-[420px] flex-1 resize-y text-[16px] leading-[1.7]"
            spellCheck={false}
            placeholder="Пишите здесь…"
            value={text}
            onPaste={(e) => props.hard && e.preventDefault()}
            onChange={(e) => props.setEssay(tab, e.target.value)}
          />
          <div className="mt-2 flex justify-between text-sm">
            <span className={n >= task.minWords ? "font-bold text-green" : "text-muted"}>
              {n} / {task.minWords} слов
            </span>
            {props.hard && <span className="text-muted">Вставка текста отключена</span>}
          </div>
        </div>
      </div>
    </main>
  );
}

function BarChart({ chart }: { chart: { unit: string; series: string[]; categories: { label: string; values: number[] }[] } }) {
  const max = 70;
  const colors = ["#9DBBF5", "#2E6BE6"];
  const W = 520, H = 260, pad = 36, bw = 26;
  const groupW = (W - pad * 2) / chart.categories.length;
  return (
    <figure className="mt-5">
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full" role="img" aria-label="Столбчатая диаграмма: доля жителей, пользующихся общественным транспортом в 2010 и 2020 годах, по городам A–D">
        {[0, 10, 20, 30, 40, 50, 60, 70].map((t) => {
          const y = H - (t / max) * (H - 20);
          return (
            <g key={t}>
              <line x1={pad} x2={W - 8} y1={y} y2={y} stroke="#E3E9F4" />
              <text x={pad - 6} y={y + 4} fontSize="11" textAnchor="end" fill="#5B6785">{t}</text>
            </g>
          );
        })}
        {chart.categories.map((c, ci) => {
          const x0 = pad + ci * groupW + groupW / 2 - bw;
          return (
            <g key={c.label}>
              {c.values.map((v, si) => {
                const h = (v / max) * (H - 20);
                return (
                  <g key={si}>
                    <rect x={x0 + si * bw} y={H - h} width={bw - 4} height={h} rx="4" fill={colors[si]} />
                    <text x={x0 + si * bw + (bw - 4) / 2} y={H - h - 5} fontSize="11" textAnchor="middle" fill="#0E1A3A" fontWeight="700">{v}</text>
                  </g>
                );
              })}
              <text x={x0 + bw} y={H + 18} fontSize="12" textAnchor="middle" fill="#0E1A3A" fontWeight="600">{c.label}</text>
            </g>
          );
        })}
        <text x={8} y={14} fontSize="11" fill="#5B6785">{chart.unit}</text>
      </svg>
      <figcaption className="mt-2 flex gap-4 text-sm text-muted">
        {chart.series.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: colors[i] }} />
            {s}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
