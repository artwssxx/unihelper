"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as I from "@/components/icons";
import IeltsTrend from "@/components/IeltsTrend";
import MockTrend from "@/components/MockTrend";
import ProLock from "@/components/ProLock";
import { useCoins } from "@/lib/useCoins";
import { usePlan } from "@/lib/auth";
import { useStore } from "@/lib/clientStore";
import { SECTION_TITLE, hardModeAvailable, loadResult } from "@/lib/mocks/client";
import type { Section } from "@/lib/mocks/types";

const CARDS: { exam: "sat" | "ielts"; section: Section; title: string; text: string; meta: string }[] = [
  { exam: "sat", section: "math", title: "SAT Math", text: "Алгебра, Advanced Math, данные и геометрия. Второй модуль подстраивается под результат первого.", meta: "2 модуля · 22 вопроса · 35 мин" },
  { exam: "sat", section: "rw", title: "SAT Reading & Writing", text: "Слова в контексте, доказательства, пунктуация и переходы — короткие тексты, как на digital SAT.", meta: "2 модуля · 27 вопросов · 32 мин" },
  { exam: "ielts", section: "reading", title: "IELTS Reading", text: "3 академических текста и 40 вопросов: True/False/Not Given, заголовки, пропуски.", meta: "40 вопросов · 60 мин" },
  { exam: "ielts", section: "writing", title: "IELTS Writing", text: "Task 1 по диаграмме и Task 2. ИИ ставит band по 4 критериям с цитатами из текста.", meta: "2 задания · 60 мин" },
];

export default function MocksHub() {
  const store = useStore();
  const [modes, setModes] = useState<Record<string, "light" | "hard">>({});
  const [canHard, setCanHard] = useState(true);
  useEffect(() => setCanHard(hardModeAvailable()), []);
  const history = [...(store?.mocks ?? [])].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const { limits, isPro } = usePlan();
  const coins = useCoins();
  const credits = coins.state?.unlocks.credits ?? {};
  // Хард-режим и Writing открываются Pro или купленными за UniCoins попытками.
  const hardOk = limits.hardMode || (credits.hard_mock ?? 0) > 0;
  const writingOk = limits.writingAi || (credits.writing_ai ?? 0) > 0;
  // Лимит Free считается по попыткам этого месяца.
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = history.filter((h) => h.finishedAt.startsWith(month));
  const used = { sat: thisMonth.filter((h) => h.exam === "sat").length, reading: thisMonth.filter((h) => h.section === "reading").length };
  const blocked = (s: Section): string | null => {
    if (s === "writing" && !writingOk) return "IELTS Writing с ИИ-оценкой — в Pro или за UniCoins.";
    if ((s === "math" || s === "rw") && used.sat >= limits.satMocksPerMonth) return `В Free — ${limits.satMocksPerMonth} SAT-мок в месяц. Этот месяц уже использован.`;
    if (s === "reading" && used.reading >= limits.ieltsReadingPerMonth) return `В Free — ${limits.ieltsReadingPerMonth} IELTS Reading в месяц. Этот месяц уже использован.`;
    return null;
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="eyebrow">МОКИ SAT И IELTS</div>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">Тренируйся как на экзамене.</h1>
        <p className="mt-3 max-w-[640px] text-base leading-relaxed text-body">
          Лёгкий режим — с подсказками и паузой, на любом устройстве. Хард — как на экзамене: жёсткий таймер, полный экран, вышел из вкладки — попытка закончена.
        </p>
      </section>

      {!canHard && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">
          Вы на телефоне или в Telegram — здесь доступен только лёгкий режим. Хард-режим откройте в браузере на компьютере.
        </p>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        {CARDS.map((c) => {
          const key = c.section;
          const mode = modes[key] ?? "light";
          const hardOff = !canHard;
          const lock = blocked(c.section);
          return (
            <div key={key} className={`lift rounded-[28px] p-7 ${c.section === "math" ? "bg-inv text-white" : "border border-line bg-surface"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-extrabold">{c.title}</h2>
                <span className={`pill whitespace-normal ${c.section === "math" ? "bg-navy-2 text-navy-text" : "bg-bg text-muted"}`}>{c.meta}</span>
              </div>
              <p className={`mt-3 text-[15px] leading-relaxed ${c.section === "math" ? "text-navy-text" : "text-body"}`}>{c.text}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className={`flex rounded-xl p-1 ${c.section === "math" ? "bg-navy-2" : "bg-bg"}`} role="radiogroup" aria-label={`Режим ${c.title}`}>
                  {(["light", "hard"] as const).map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={mode === m}
                      disabled={m === "hard" && hardOff}
                      onClick={() => (m === "hard" && !hardOk ? setModes({ ...modes, [key]: "light", [`${key}-lock`]: "hard" } as typeof modes) : setModes({ ...modes, [key]: m }))}
                      className={`rounded-lg px-3.5 py-2 text-sm font-bold transition disabled:opacity-40 ${
                        mode === m ? (m === "hard" ? "bg-orange text-white" : "bg-primary text-white") : c.section === "math" ? "text-navy-text" : "text-muted"
                      }`}
                    >
                      {m === "light" ? "Лёгкий" : isPro ? "Хард" : hardOk ? `Хард · ${credits.hard_mock}` : <span className="inline-flex items-center gap-1"><I.Lock size={13} />Хард · Pro</span>}
                    </button>
                  ))}
                </div>
                {lock && c.section === "writing" && !writingOk ? null : lock ? (
                  <Link href="/pricing" className="btn-primary"><I.Lock size={16} /> Открыть в Pro</Link>
                ) : (
                <Link
                  href={`/mocks/run?exam=${c.exam}&section=${c.section}&mode=${mode}`}
                  className={c.section === "math" ? "inline-flex items-center justify-center rounded-xl bg-white px-[18px] py-[13px] text-[15px] font-extrabold text-[#2446B5]" : "btn-primary"}
                >
                  Начать мок
                </Link>
                )}
              </div>
              {lock && c.section === "writing" && !writingOk ? (
                <div className="mt-4"><ProLock title="IELTS Writing с ИИ-оценкой" text="Band по 4 критериям с цитатами из твоего текста. Одна проверка — за UniCoins." coins="writing_ai" /></div>
              ) : lock ? (
                <p className={`mt-3 text-sm ${c.section === "math" ? "text-navy-text" : "text-body"}`}>{lock}</p>
              ) : null}
              {(modes as Record<string, string>)[`${key}-lock`] && !hardOk && (
                <div className="mt-4"><ProLock title="Хард-режим — как на экзамене" text="Жёсткий таймер, полный экран, уход со вкладки прерывает попытку. Одну хард-попытку можно открыть за UniCoins." coins="hard_mock" onUnlocked={() => setModes({ ...modes, [key]: "hard" })} /></div>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-line bg-surface p-6">
        <div>
          <h2 className="m-0 text-xl font-extrabold">Уже сдавал IELTS или SAT?</h2>
          <p className="mt-1 max-w-[620px] text-sm text-body">Загрузи отчёт (PDF или фото) или опиши результат — разберём по секциям, сравним с требованиями твоих вузов и соберём план.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/mocks/report" className="btn-primary">Разобрать мой результат</Link>
          <Link href="/mocks/calculator" className="btn-secondary">Графический калькулятор</Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-[1fr_1fr_0.9fr]">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xl font-extrabold">Динамика SAT</h2>
            <span className="pill bg-bg text-muted">примерно</span>
          </div>
          <MockTrend history={store?.mocks ?? []} />
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xl font-extrabold">Динамика IELTS</h2>
            <Link href="/mocks/report" className="text-sm font-bold text-primary">+ результат</Link>
          </div>
          <IeltsTrend mocks={store?.mocks ?? []} scores={store?.scores ?? []} />
        </div>
        <div className="card">
          <h2 className="m-0 text-xl font-extrabold">Официальные пробники</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">
            Наши моки — оригинальные вопросы в формате экзамена, а не задания из официальных материалов. Перед экзаменом пройдите и официальные пробники.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <a className="btn-secondary justify-between" href="https://bluebook.collegeboard.org" target="_blank" rel="noopener noreferrer">
              Bluebook (College Board) <span aria-hidden>↗</span>
            </a>
            <a className="btn-secondary justify-between" href="https://ielts.org" target="_blank" rel="noopener noreferrer">
              Официальный сайт IELTS <span aria-hidden>↗</span>
            </a>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Free: 1 SAT-мок и 1 IELTS Reading в месяц в лёгком режиме, Pro — без лимита и хард-режим. На время беты ограничения не включены.
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="m-0 text-xl font-extrabold">История попыток</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Пока пусто. Пройдите первый мок — результат появится здесь.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 font-semibold">Дата</th>
                  <th className="pb-2 font-semibold">Мок</th>
                  <th className="pb-2 font-semibold">Режим</th>
                  <th className="pb-2 font-semibold">Результат</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.attemptId} className="border-t border-line-3">
                    <td className="py-3">{new Date(h.finishedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</td>
                    <td className="py-3 font-semibold">{SECTION_TITLE[h.section]}</td>
                    <td className="py-3">{h.mode === "hard" ? <span className="pill bg-orange-soft text-orange-ink-2">хард</span> : <span className="pill bg-bg text-muted">лёгкий</span>}</td>
                    <td className="py-3 font-bold">
                      {h.status === "interrupted" ? (
                        <span className="text-red">прервано</span>
                      ) : h.scoreLow ? (
                        `≈ ${h.scoreLow}–${h.scoreHigh}`
                      ) : h.band != null ? (
                        `band ≈ ${h.band}`
                      ) : (
                        "сдано"
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {loadResult(h.attemptId) && (
                      <Link className="inline-flex items-center gap-1 font-bold text-primary" href={`/mocks/result/${h.attemptId}`}>
                        Разбор <I.Check size={14} />
                      </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
