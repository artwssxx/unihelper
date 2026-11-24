import cfg from "@/config/mocks.json";
import satScale from "@/config/sat-scale.json";
import readingScale from "@/config/ielts-reading-scale.json";
import { buildMathBank } from "./bank/satMath";
import { buildRwBank } from "./bank/satRw";
import { buildReadingBank } from "./bank/ieltsReading";
import type { Difficulty, DomainStat, MockResult, Mode, PublicQuestion, Question, ReviewItem, Section } from "./types";

// Чистая логика моков: подбор вопросов, проверка, подсчёт. Без сети и хранилища — покрыта тестами.

let BANK: Map<string, Question> | null = null;
export function bank(): Map<string, Question> {
  if (!BANK) {
    BANK = new Map();
    for (const q of [...buildMathBank(), ...buildRwBank(), ...buildReadingBank()]) BANK.set(q.id, q);
  }
  return BANK;
}

export function getQuestion(id: string): Question | undefined {
  return bank().get(id);
}

export function sectionQuestions(section: Section): Question[] {
  return [...bank().values()].filter((q) => q.section === section && q.verified);
}

export function toPublic(q: Question): PublicQuestion {
  // Ответ, допустимые варианты, разбор и подсказка не уходят на клиент.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { answer: _a, accept: _ac, explanation: _e, hint: _h, verified: _v, source: _s, ...pub } = q;
  return pub;
}

export function satSpec(section: "math" | "rw") {
  return cfg.sat[section];
}

type Rand = () => number;

function shuffle<T>(xs: T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Чередуем навыки, чтобы в модуле не шли подряд однотипные задачи. */
function diversify(qs: Question[]): Question[] {
  const groups = new Map<string, Question[]>();
  for (const q of qs) groups.set(q.skill, [...(groups.get(q.skill) ?? []), q]);
  const lists = [...groups.values()];
  const out: Question[] = [];
  for (let i = 0; out.length < qs.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

/**
 * Подбор вопросов модуля по долям сложности. Сначала — ещё не виденные учеником,
 * при нехватке нужной сложности добираем ближайшей.
 */
export function pickQuestions(
  pool: Question[],
  count: number,
  mix: Record<string, number>,
  opts: { exclude?: Set<string>; seen?: Set<string>; rand: Rand },
): string[] {
  const exclude = opts.exclude ?? new Set();
  const seen = opts.seen ?? new Set();
  const avail = pool.filter((q) => !exclude.has(q.id));
  const byDiff = (d: number) =>
    [...diversify(shuffle(avail.filter((q) => q.difficulty === d && !seen.has(q.id)), opts.rand)),
     ...diversify(shuffle(avail.filter((q) => q.difficulty === d && seen.has(q.id)), opts.rand))];
  const chosen: Question[] = [];
  const targets = ([1, 2, 3] as const).map((d) => ({ d, n: Math.round(count * (mix[String(d)] ?? 0)) }));
  // поправка округления
  let diff = count - targets.reduce((s, t) => s + t.n, 0);
  for (const t of [...targets].sort((a, b) => (mix[String(b.d)] ?? 0) - (mix[String(a.d)] ?? 0))) {
    if (diff === 0) break;
    if ((mix[String(t.d)] ?? 0) > 0) { t.n += Math.sign(diff); diff -= Math.sign(diff); }
  }
  for (const t of targets) chosen.push(...byDiff(t.d).slice(0, t.n));
  if (chosen.length < count) {
    // нехватка: ближайшая по весу сложность
    const weighted = ([1, 2, 3] as Difficulty[]).sort((a, b) => (mix[String(b)] ?? 0) - (mix[String(a)] ?? 0));
    for (const d of weighted) {
      for (const q of byDiff(d)) {
        if (chosen.length >= count) break;
        if (!chosen.includes(q)) chosen.push(q);
      }
    }
  }
  // в модуле вопросы идут от простых к сложным, как на digital SAT
  return chosen.slice(0, count).sort((a, b) => a.difficulty - b.difficulty).map((q) => q.id);
}

export function buildSatModule1(section: "math" | "rw", seen: Set<string>, rand: Rand): string[] {
  return pickQuestions(sectionQuestions(section), satSpec(section).questionsPerModule, cfg.sat.module1Mix, { seen, rand });
}

export function buildSatModule2(section: "math" | "rw", path: "easy" | "hard", exclude: Set<string>, seen: Set<string>, rand: Rand): string[] {
  return pickQuestions(sectionQuestions(section), satSpec(section).questionsPerModule, cfg.sat.module2Mix[path], { exclude, seen, rand });
}

export function buildReadingTest(): string[] {
  return sectionQuestions("reading").map((q) => q.id);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/^(the|a|an) /, "");

export function isCorrect(q: Question, given: string | null | undefined): boolean {
  if (given == null || given === "") return false;
  if (q.answerType === "mcq") return given.trim().toUpperCase() === q.answer;
  if (q.answerType === "spr") {
    const v = Number(given.replace(",", ".").replace("−", "-").trim());
    return Number.isFinite(v) && Math.abs(v - Number(q.answer)) < 1e-9;
  }
  const ok = [q.answer, ...(q.accept ?? [])].map(norm);
  return ok.includes(norm(given));
}

const W = cfg.sat.difficultyWeights as Record<string, number>;
export function weightOf(d: Difficulty) {
  return W[String(d)] ?? 1;
}

export function gradeIds(ids: string[], answers: Record<string, string>) {
  let correct = 0, weighted = 0, weightedTotal = 0;
  for (const id of ids) {
    const q = getQuestion(id);
    if (!q) continue;
    const w = weightOf(q.difficulty);
    weightedTotal += w;
    if (isCorrect(q, answers[id])) { correct++; weighted += w; }
  }
  return { correct, total: ids.length, weighted, weightedTotal, fraction: weightedTotal ? weighted / weightedTotal : 0 };
}

export function module2Path(fractionModule1: number): "easy" | "hard" {
  return fractionModule1 >= cfg.sat.hardPathThreshold ? "hard" : "easy";
}

function interp(points: number[][], x: number): number {
  const p = [...points].sort((a, b) => a[0] - b[0]);
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return p[p.length - 1][1];
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Диапазон балла секции SAT (200–800). Не официальный балл. */
export function satSectionScore(fraction: number, path: "easy" | "hard") {
  const mid = interp(satScale[path], Math.max(0, Math.min(1, fraction)));
  const hw = satScale.halfWidth;
  return { low: Math.max(200, round10(mid - hw)), high: Math.min(800, round10(mid + hw)) };
}

export function ieltsReadingBand(correct: number): number {
  for (const [min, band] of readingScale.table) if (correct >= min) return band;
  return 0;
}

export const DOMAIN_RU: Record<string, string> = {
  Algebra: "Algebra",
  "Advanced Math": "Advanced Math",
  "Problem-Solving and Data Analysis": "Problem-Solving & Data",
  "Geometry and Trigonometry": "Geometry & Trig",
  "Craft and Structure": "Craft and Structure",
  "Information and Ideas": "Information and Ideas",
  "Standard English Conventions": "English Conventions",
  "Expression of Ideas": "Expression of Ideas",
};

export interface ModuleRecord {
  module: number;
  qids: string[];
  answers: Record<string, string>;
  times: Record<string, number>;
}

export function buildResult(args: {
  attemptId: string;
  exam: "sat" | "ielts";
  section: Section;
  mode: Mode;
  modules: ModuleRecord[];
  path?: "easy" | "hard";
}): MockResult {
  const review: ReviewItem[] = [];
  const stats = new Map<string, DomainStat>();
  let totalTime = 0;
  for (const m of args.modules) {
    for (const id of m.qids) {
      const q = getQuestion(id);
      if (!q) continue;
      const given = m.answers[id] ?? null;
      const correct = isCorrect(q, given);
      const timeSec = Math.max(0, Math.round(m.times[id] ?? 0));
      totalTime += timeSec;
      review.push({
        id, domain: q.domain, skill: q.skill, difficulty: q.difficulty, stem: q.stem, passage: q.passage,
        choices: q.choices, answer: q.answer, given, correct, explanation: q.explanation, timeSec, module: m.module,
      });
      const key = args.section === "reading" ? q.skill : q.domain;
      const s = stats.get(key) ?? { domain: key, correct: 0, total: 0 };
      s.total++;
      if (correct) s.correct++;
      stats.set(key, s);
    }
  }
  const allIds = args.modules.flatMap((m) => m.qids);
  const allAnswers = Object.assign({}, ...args.modules.map((m) => m.answers));
  const g = gradeIds(allIds, allAnswers);
  const domains = [...stats.values()];
  const weakDomains = domains
    .filter((d) => d.total > 0 && d.correct / d.total < 0.6)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .map((d) => d.domain);

  const res: MockResult = {
    attemptId: args.attemptId, exam: args.exam, section: args.section, mode: args.mode,
    raw: { correct: g.correct, total: g.total }, domains, weakDomains,
    avgTimeSec: review.length ? Math.round(totalTime / review.length) : 0,
    review, tips: [],
  };
  if (args.exam === "sat" && args.path) {
    const s = satSectionScore(g.fraction, args.path);
    res.scoreLow = s.low;
    res.scoreHigh = s.high;
    res.module2Path = args.path;
  }
  if (args.section === "reading") res.band = ieltsReadingBand(g.correct);
  res.tips = ruleTips(res);
  return res;
}

const TIP_BY_DOMAIN: Record<string, string> = {
  Algebra: "Повторите линейные уравнения и системы: решайте 10 задач в день, проверяя ответ подстановкой.",
  "Advanced Math": "Разберите квадратичные функции: вершина, корни, теорема Виета, композиция функций.",
  "Problem-Solving and Data Analysis": "Тренируйте проценты и статистику: последовательные изменения цены, среднее и медиана.",
  "Geometry and Trigonometry": "Выучите базовые формулы (Пифагор, окружность, подобие) и решайте задачи с чертежом.",
  "Craft and Structure": "Работайте со словами в контексте: подставляйте каждый вариант и проверяйте тон и логику предложения.",
  "Information and Ideas": "Ищите прямое подтверждение в тексте: правильный ответ всегда опирается на конкретную фразу.",
  "Standard English Conventions": "Повторите пунктуацию между независимыми предложениями (; : ,) и согласование подлежащего со сказуемым.",
  "Expression of Ideas": "Определяйте логическую связь (контраст, следствие, пример) до того, как читать варианты переходов.",
  "True/False/Not Given": "Различайте FALSE и NOT GIVEN: FALSE — текст противоречит утверждению, NOT GIVEN — текст о нём молчит.",
  "Yes/No/Not Given": "В Yes/No/Not Given ищите мнение автора, а не факты.",
  "Sentence completion": "Проверяйте лимит слов и копируйте слова из текста без изменений.",
  "Summary completion": "Сначала определите часть речи пропуска, затем ищите синоним вокруг в тексте.",
  "Matching headings": "Читайте первое и последнее предложения абзаца — там обычно главная мысль.",
  "Multiple choice": "Найдите место в тексте по ключевому слову вопроса и сравните каждый вариант с ним.",
};

export function ruleTips(r: MockResult): string[] {
  const tips = r.weakDomains.map((d) => TIP_BY_DOMAIN[d]).filter(Boolean);
  if (r.avgTimeSec > 0) {
    const spec = r.exam === "sat" ? satSpec(r.section as "math" | "rw") : null;
    const limit = spec ? (spec.minutesPerModule * 60) / spec.questionsPerModule : 90;
    if (r.avgTimeSec > limit) tips.push("Вы тратите на вопрос больше времени, чем есть на экзамене: пропускайте трудные и возвращайтесь к ним в конце модуля.");
  }
  if (tips.length < 3) tips.push("Повторите мок через 1–2 недели в хард-режиме, чтобы увидеть динамику.");
  if (tips.length < 3) tips.push("Перед реальным экзаменом пройдите официальные пробники (Bluebook для SAT, официальные материалы IELTS).");
  return tips.slice(0, 3);
}

export type { Difficulty };
