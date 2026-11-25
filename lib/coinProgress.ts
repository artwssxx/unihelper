// Монеты за прогресс и достижения: чистый расчёт (без сети), исполняет сервер (lib/server/coins.ts).
// На входе — данные ученика, базовые значения и уже выданные награды; на выходе — что начислить.
// Всё идемпотентно: каждая награда имеет свой (reason, ref) и выдаётся один раз.

import { ACHIEVEMENTS, DAILY_BONUS, PROGRESS, QUESTS, levelBonus, levelOf, type Metrics } from "./coins";
import type { MockHistoryItem } from "./clientStore";
import { withMocks } from "./mocks/profileLink";
import { scoreProfile } from "./scoring/strength";
import type { Profile } from "./types";

export type StudentData = {
  profile?: Profile | null;
  mocks?: MockHistoryItem[];
  roadmap?: Record<string, string>;
  lessons?: Record<string, { watched: boolean }>;
};
export type Baselines = { strengthMax?: number; satBest?: number; ieltsBest?: number };
export type Award = { amount: number; reason: string; ref: string };

const mid = (m: MockHistoryItem) => (m.scoreLow != null && m.scoreHigh != null ? Math.round((m.scoreLow + m.scoreHigh) / 2 / 10) * 10 : null);

export function metricsOf(d: StudentData, streak: number, invites: number): Metrics {
  const done = (d.mocks ?? []).filter((m) => m.status === "completed");
  const best = (section: string) => Math.max(0, ...done.filter((m) => m.exam === "sat" && m.section === section).map((m) => mid(m) ?? 0));
  const math = best("math"), rw = best("rw");
  const bands = done.filter((m) => m.exam === "ielts" && m.band != null).map((m) => m.band!);
  return {
    mocks: done.length,
    bestSat: math && rw ? math + rw : null,
    bestIelts: bands.length ? Math.max(...bands) : null,
    strength: d.profile ? scoreProfile(withMocks(d.profile, d.mocks ?? [])).score : 0,
    streakMax: streak,
    stepsDone: Object.values(d.roadmap ?? {}).filter((s) => s === "done").length,
    lessons: Object.values(d.lessons ?? {}).filter((l) => l.watched).length,
    invites,
  };
}

/** Что начислить. given — уже выданные награды «reason:ref»; todayReasons — причины начислений за сегодня. */
export function planAwards(args: {
  data: StudentData;
  metrics: Metrics;
  base: Baselines;
  given: Set<string>;
  todayReasons: Set<string>;
  stepsToday: number;
  xp: number;
  today: string;
}): { awards: Award[]; base: Baselines } {
  const { data, metrics: m, given, today } = args;
  const base = { ...args.base };
  const awards: Award[] = [];
  const give = (amount: number, reason: string, ref: string) => {
    if (amount > 0 && !given.has(`${reason}:${ref}`)) awards.push({ amount, reason, ref });
  };

  // Сила профиля: первое значение — точка отсчёта, дальше монеты за каждый новый пункт максимума.
  if (m.strength > 0) {
    if (base.strengthMax == null) base.strengthMax = m.strength;
    else if (m.strength > base.strengthMax) {
      give((m.strength - base.strengthMax) * PROGRESS.strengthPoint, "strength", `max:${m.strength}`);
      base.strengthMax = m.strength;
    }
  }
  // Личные рекорды моков (шаг SAT — 20 баллов, IELTS — 0.5): первый результат — точка отсчёта.
  if (m.bestSat != null) {
    const b = Math.floor(m.bestSat / PROGRESS.satStep) * PROGRESS.satStep;
    if (base.satBest == null) base.satBest = b;
    else if (b > base.satBest) {
      give(PROGRESS.personalBest, "pb", `sat:${b}`);
      base.satBest = b;
    }
  }
  if (m.bestIelts != null) {
    if (base.ieltsBest == null) base.ieltsBest = m.bestIelts;
    else if (m.bestIelts >= base.ieltsBest + PROGRESS.ieltsStep) {
      give(PROGRESS.personalBest, "pb", `ielts:${m.bestIelts}`);
      base.ieltsBest = m.bestIelts;
    }
  }
  // Шаги дорожной карты из шаблона (свои шаги «c-…» не в счёт), не больше stepsPerDay в день.
  let stepsLeft = PROGRESS.stepsPerDay - args.stepsToday;
  for (const [id, st] of Object.entries(data.roadmap ?? {})) {
    if (stepsLeft <= 0) break;
    if (st !== "done" || id.startsWith("c-") || given.has(`step:${id}`)) continue;
    give(PROGRESS.step, "step", id);
    stepsLeft--;
  }
  // Достижения.
  for (const a of ACHIEVEMENTS) if ((m[a.metric] ?? 0) >= a.target) give(a.reward, "ach", a.id);
  // Все задания дня → бонус.
  const reasons = new Set([...args.todayReasons, ...awards.map((a) => a.reason)]);
  if (QUESTS.every((q) => reasons.has(q.id))) give(DAILY_BONUS, "daily", today);
  // Уровни: бонус за каждый достигнутый (опыт растёт и от самих наград — считаем до устойчивости).
  let xp = args.xp + awards.reduce((s, a) => s + a.amount, 0);
  for (let guard = 0; guard < 10; guard++) {
    const lvl = levelOf(xp).level;
    const missing = Array.from({ length: lvl - 1 }, (_, i) => i + 2).filter((l) => !given.has(`level:${l}`) && !awards.some((a) => a.reason === "level" && a.ref === String(l)));
    if (!missing.length) break;
    for (const l of missing) {
      give(levelBonus(l), "level", String(l));
      xp += levelBonus(l);
    }
  }
  return { awards, base };
}
