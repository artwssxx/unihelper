"use client";

import Link from "next/link";
import { useState } from "react";
import * as I from "@/components/icons";
import { useStore } from "@/lib/clientStore";
import { COURSES, LESSONS, lessonsForDomains } from "@/lib/content/lessons";

export default function LessonsPage() {
  const store = useStore();
  const [topic, setTopic] = useState<string>("all");
  const progress = store?.lessons ?? {};
  const lastWeak = [...(store?.mocks ?? [])].filter((m) => m.status === "completed" && m.weakDomains?.length).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
  const recommended = lastWeak ? lessonsForDomains(lastWeak.weakDomains ?? []) : [];
  const courses = COURSES.filter((c) => topic === "all" || c.topic === topic);

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">УРОКИ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">Короткие уроки по слабым темам</h1>
        <p className="mt-2 max-w-[680px] text-body">
          5–15 минут на урок и мини-тест из того же банка, что и моки. Урок засчитан, когда конспект прочитан и тест сдан от 60%. Видео записывают менторы, поступившие на грант, — они появятся постепенно.
        </p>
      </section>

      {recommended.length > 0 && (
        <section className="rounded-[26px] bg-ink p-6 text-white">
          <h2 className="text-xl font-extrabold">Тебе нужны эти уроки</h2>
          <p className="mt-1 text-sm text-navy-text">По темам с низкой точностью в последнем моке.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recommended.map((l) => (
              <Link key={l.id} href={`/lessons/${l.id}`} className="rounded-2xl bg-navy-2 p-4 hover:bg-[#22345f]">
                <div className="font-extrabold">{l.title}</div>
                <div className="mt-1 text-sm text-navy-text">{l.minutes} мин{l.isPro ? " · Pro" : ""}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тема">
        {["all", "SAT Math", "SAT Reading & Writing", "IELTS", "Эссе и гранты"].map((t) => (
          <button key={t} role="radio" aria-checked={topic === t} className="chip px-4 py-2 text-sm" data-on={topic === t} onClick={() => setTopic(t)}>
            {t === "all" ? "Все темы" : t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {courses.map((c) => {
          const ls = LESSONS.filter((l) => l.courseId === c.id);
          const done = ls.filter((l) => progress[l.id]?.watched && (progress[l.id]?.quizScore ?? 0) >= 0.6).length;
          return (
            <section key={c.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-xl font-extrabold">{c.title}</h2>
                  <p className="mt-1 text-sm text-body">{c.description}</p>
                </div>
                <span className="pill bg-bg text-muted">{done} / {ls.length} пройдено · {c.language === "ru" ? "русский" : "oʻzbekcha"}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {ls.map((l) => {
                  const p = progress[l.id];
                  const passed = p?.watched && (p.quizScore ?? 0) >= 0.6;
                  return (
                    <Link key={l.id} href={`/lessons/${l.id}`} className="lift flex items-center gap-4 rounded-2xl border border-line p-4">
                      <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${passed ? "bg-green-soft text-green" : "bg-primary-soft text-primary"}`}>
                        {passed ? <I.Check /> : <I.Play />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold">{l.title}</div>
                        <div className="text-[13px] text-muted">
                          {l.minutes} мин · {l.isPro ? "Pro" : "бесплатно"}
                          {p?.quizScore != null ? ` · тест ${Math.round(p.quizScore * 100)}%` : ""}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
