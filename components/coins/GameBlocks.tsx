"use client";

import * as I from "@/components/icons";
import { LEVELS, PROGRESS, type CoinState } from "@/lib/coins";

// Игровая часть UniCoins: уровень, задания дня, монеты за прогресс и достижения.

export function LevelCard({ s }: { s: CoinState }) {
  const l = s.level;
  const next = LEVELS.find((x) => x.level === l.level + 1);
  return (
    <section className="card flex flex-wrap items-center gap-5">
      <div className="relative flex h-20 w-20 flex-none items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--pri) ${Math.round(l.progress * 360)}deg, var(--line-3) 0)` }} aria-hidden>
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-surface-solid">
          <span className="text-[11px] font-bold text-muted">уровень</span>
          <span className="text-2xl font-extrabold leading-none">{l.level}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl font-extrabold">{l.title}</div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(l.progress * 100)} aria-label="Прогресс до следующего уровня">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(l.progress * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-muted">
          {next ? `${l.xp} / ${l.to} опыта — до уровня «${next.title}» (+${next.level * 10} монет за новый уровень)` : `${l.xp} опыта — максимальный уровень`}
        </p>
      </div>
    </section>
  );
}

export function Quests({ s }: { s: CoinState }) {
  const done = s.quests.filter((q) => q.done).length;
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Задания дня</h2>
        <span className={`pill ${s.dailyBonus.done ? "bg-green-soft text-green" : "bg-primary-soft text-primary-ink"}`}>
          {s.dailyBonus.done ? `бонус +${s.dailyBonus.reward} получен` : `${done} из ${s.quests.length} · все — бонус +${s.dailyBonus.reward}`}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {s.quests.map((q) => (
          <li key={q.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${q.done ? "border-green/30 bg-green-soft text-green" : "border-line"}`}>
            <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${q.done ? "bg-green text-white" : "border-2 border-line-2"}`}>{q.done && <I.Check size={14} />}</span>
            {q.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProgressRewards() {
  const rows = [
    ["Рост силы профиля", `+${PROGRESS.strengthPoint} за каждый новый пункт из 100`],
    ["Личный рекорд в моке", `+${PROGRESS.personalBest} (SAT — каждые +${PROGRESS.satStep} баллов, IELTS — +${PROGRESS.ieltsStep})`],
    ["Шаг дорожной карты выполнен", `+${PROGRESS.step}, до ${PROGRESS.stepsPerDay} в день`],
  ];
  return (
    <section className="card space-y-2">
      <h2 className="text-xl font-extrabold">Монеты за прогресс</h2>
      <p className="text-sm text-body">Растёшь — получаешь. Считает сервер по твоим результатам, каждый рост — один раз.</p>
      <ul className="divide-y divide-line-3 text-sm">
        {rows.map(([k, v]) => (
          <li key={k} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-semibold">{k}</span><span className="text-muted">{v}</span></li>
        ))}
      </ul>
    </section>
  );
}

export function Achievements({ s }: { s: CoinState }) {
  const got = s.achievements.filter((a) => a.done).length;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Достижения</h2>
        <span className="pill bg-line-3 text-muted">{got} из {s.achievements.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {s.achievements.map((a) => {
          const p = Math.min(1, a.value / a.target);
          return (
            <article key={a.id} className={`card flex flex-col gap-2 p-4 ${a.done ? "" : "opacity-90"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.done ? "bg-primary text-white" : "bg-line-3 text-muted"}`}>
                  {a.done ? <I.Check size={20} /> : <I.Lock size={18} />}
                </span>
                <span className="pill bg-orange-soft text-orange-ink-2">+{a.reward}</span>
              </div>
              <div className="font-extrabold leading-snug">{a.title}</div>
              <div className="text-xs text-muted">{a.hint}</div>
              {!a.done && (
                <div className="mt-auto pt-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-3"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(p * 100)}%` }} /></div>
                  <div className="mt-1 text-[11px] font-bold text-muted">{Number.isInteger(a.target) ? `${Math.min(a.value, a.target)} / ${a.target}` : `${a.value} / ${a.target}`}</div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
