import cfg from "@/config/mocks.json";
import satScale from "@/config/sat-scale.json";
import readingScale from "@/config/ielts-reading-scale.json";
import { buildMathBank, makeMath, MATH_KEYS, rng } from "./bank/satMath";
import { makeRw, rwGeneratorBases } from "./bank/rwGen";
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

// ── Варианты: «<база>~<сид base36>». Каждая попытка получает новые сиды, поэтому моки не повторяются:
// SAT Math — новые числа в шаблоне, SAT RW — генераторы и перемешанные варианты ответов,
// IELTS Reading (multiple choice) — перемешанные варианты. Вопрос восстанавливается по ID на сервере.

const GEN = new Map<string, Question>();
export const baseOf = (id: string) => id.split("~")[0];

function permutable(q: Question) {
  return q.answerType === "mcq" && q.choices?.length === 4 && (q.exam === "sat" || q.skill === "Multiple choice");
}

function permuted(q: Question, seed: number, id: string): Question {
  const r = rng(seed);
  const order = shuffle([0, 1, 2, 3], r);
  const letters = ["A", "B", "C", "D"];
  return { ...q, id, choices: order.map((i) => q.choices![i]), answer: letters[order.indexOf(letters.indexOf(q.answer))] };
}

export function getQuestion(id: string): Question | undefined {
  const fixed = bank().get(id);
  if (fixed) return fixed;
  const cached = GEN.get(id);
  if (cached) return cached;
  const [base, s] = id.split("~");
  if (!s || !/^[0-9a-z]{1,8}$/.test(s)) return undefined;
  const seed = parseInt(s, 36);
  let q: Question | null | undefined;
  if (base.startsWith("m-")) q = makeMath(base.slice(2), seed);
  else if (base.startsWith("rwg-")) q = makeRw(id);
  else {
    const orig = bank().get(base);
    if (orig && permutable(orig)) q = permuted(orig, seed, id);
  }
  if (!q || q.id !== id) return undefined;
  if (GEN.size > 20_000) GEN.clear();
  GEN.set(id, q);
  return q;
}

/** Вопросы из пула тестов в базе (IELTS Reading от ИИ): сервер подгружает их перед проверкой. */
export function registerQuestions(qs: Question[]) {
  if (GEN.size > 20_000) GEN.clear();
  for (const q of qs) GEN.set(q.id, q);
}

const newSeed = (rand: Rand) => (Math.floor(rand() * 2_000_000_000) + 1).toString(36);

/** Пул вопросов одной попытки SAT: свежие варианты всех шаблонов и вопросов банка. */
export function satPool(section: "math" | "rw", rand: Rand): Question[] {
  const out: Question[] = [];
  const add = (base: string, variants: number) => {
    let made = 0;
    for (let t = 0; t < variants * 6 && made < variants; t++) {
      const q = getQuestion(`${base}~${newSeed(rand)}`);
      if (q) { out.push(q); made++; }
    }
  };
  if (section === "math") for (const key of MATH_KEYS) add(`m-${key}`, 3);
  else {
    for (const q of sectionQuestions("rw")) add(q.id, 1);
    for (const b of rwGeneratorBases()) add(b, 1);
  }
  return out;
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
  // Сравниваем по базе: вариант уже виденного вопроса тоже считается виденным.
  const isSeen = (q: Question) => seen.has(q.id) || seen.has(baseOf(q.id));
  const avail = pool.filter((q) => !exclude.has(q.id) && !exclude.has(baseOf(q.id)));
  const byDiff = (d: number) =>
    [...diversify(shuffle(avail.filter((q) => q.difficulty === d && !isSeen(q)), opts.rand)),
     ...diversify(shuffle(avail.filter((q) => q.difficulty === d && isSeen(q)), opts.rand))];
  const chosen: Question[] = [];
  const families = new Set<string>();
  // Сначала по одному варианту каждого шаблона; повтор шаблона (с другими числами) — только при нехватке.
  const skillCount = (q: Question) => chosen.filter((c) => c.skill === q.skill).length;
  const takeFrom = (list: Question[], n: number, allowRepeat: boolean) => {
    let took = 0;
    // Повторяя шаблон, берём сначала навыки, которых в модуле меньше всего.
    const ordered = allowRepeat ? [...list].sort((a, b) => skillCount(a) - skillCount(b)) : list;
    for (const q of ordered) {
      if (took >= n) break;
      if (chosen.includes(q) || (!allowRepeat && families.has(baseOf(q.id)))) continue;
      chosen.push(q);
      families.add(baseOf(q.id));
      took++;
    }
    return took;
  };
  const targets = ([1, 2, 3] as const).map((d) => ({ d, n: Math.round(count * (mix[String(d)] ?? 0)) }));
  // поправка округления
  let diff = count - targets.reduce((s, t) => s + t.n, 0);
  for (const t of [...targets].sort((a, b) => (mix[String(b.d)] ?? 0) - (mix[String(a.d)] ?? 0))) {
    if (diff === 0) break;
    if ((mix[String(t.d)] ?? 0) > 0) { t.n += Math.sign(diff); diff -= Math.sign(diff); }
  }
  for (const t of targets) {
    const got = takeFrom(byDiff(t.d), t.n, false);
    if (got < t.n) takeFrom(byDiff(t.d), t.n - got, true);
  }
  if (chosen.length < count) {
    // нехватка: ближайшая по весу сложность
    const weighted = ([1, 2, 3] as Difficulty[]).sort((a, b) => (mix[String(b)] ?? 0) - (mix[String(a)] ?? 0));
    for (const d of weighted) takeFrom(byDiff(d), count - chosen.length, false);
    for (const d of weighted) takeFrom(byDiff(d), count - chosen.length, true);
  }
  // в модуле вопросы идут от простых к сложным, как на digital SAT
  return chosen.slice(0, count).sort((a, b) => a.difficulty - b.difficulty).map((q) => q.id);
}

export function buildSatModule1(section: "math" | "rw", seen: Set<string>, rand: Rand): string[] {
  return pickQuestions(satPool(section, rand), satSpec(section).questionsPerModule, cfg.sat.module1Mix, { seen, rand });
}

/** Модуль 2: вопросы модуля 1 исключены, их шаблоны — в конце очереди (как виденные). */
export function buildSatModule2(section: "math" | "rw", path: "easy" | "hard", exclude: Set<string>, seen: Set<string>, rand: Rand): string[] {
  const avoid = new Set([...seen, ...[...exclude].map(baseOf)]);
  return pickQuestions(satPool(section, rand), satSpec(section).questionsPerModule, cfg.sat.module2Mix[path], { exclude, seen: avoid, rand });
}

/** IELTS Reading: варианты в multiple choice перемешиваются при каждой попытке. */
export function buildReadingTest(rand: Rand = Math.random): string[] {
  return sectionQuestions("reading").map((q) => (permutable(q) ? `${q.id}~${newSeed(rand)}` : q.id));
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
  // Тест из пула может содержать чуть меньше 40 вопросов: приводим к шкале из 40.
  if (args.section === "reading") res.band = ieltsReadingBand(g.total === 40 || !g.total ? g.correct : Math.round((g.correct * 40) / g.total));
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
