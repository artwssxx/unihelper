import type { AxisResult, Profile, StrengthLevel, StrengthResult } from "../types";
import { gradesGpa100, gradesSummary, gradeText, SUBJECT_RU } from "../grades";
import { profileMajors } from "../profileConst";
import { STRENGTH_POINTS as SP, STRENGTH_RULES, SUBJECT_RULES } from "./config";

export const LEVEL_NAMES = ["начальный", "развивающийся", "сильный", "очень сильный"] as const;

export function gpaTo100(gpa: number | null, scale: 5 | 100): number | null {
  if (gpa == null || Number.isNaN(gpa)) return null;
  if (scale === 100) return Math.max(0, Math.min(100, gpa));
  // 5-балльная: 5.0 → 100, 4.0 → 80, 3.0 → 60
  return Math.max(0, Math.min(100, (gpa / 5) * 100));
}

/** GPA ученика 0–100: по оценкам предметов, если их достаточно, иначе — введённый в анкете. */
export function profileGpa100(p: Profile): number | null {
  return gradesGpa100(p.grades) ?? gpaTo100(p.gpa, p.gpaScale);
}

/** Линейная интерполяция между опорными точками (с обрезкой по краям). */
export function piecewise(v: number, xs: readonly number[], ys: readonly number[]): number {
  if (v <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (v <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (v - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

/** Уровень (0–3) по очкам 0–100: те же границы, что у общего итога. */
export function levelOfPoints(points: number): StrengthLevel {
  return SP.bands.filter((b) => points >= b).length as StrengthLevel;
}

/** Сколько очков до следующего уровня и как он называется (null — уже максимум). */
export function nextBand(score: number): { name: string; left: number } | null {
  const b = SP.bands.find((x) => score < x);
  return b == null ? null : { name: LEVEL_NAMES[SP.bands.indexOf(b) + 1], left: b - score };
}

function levelByThresholds(value: number, thresholds: readonly number[]): StrengthLevel {
  let lvl = 0;
  thresholds.forEach((t, i) => {
    if (value >= t) lvl = i + 1;
  });
  return lvl as StrengthLevel;
}

function academics(p: Profile): AxisResult {
  const g = profileGpa100(p);
  if (g == null) return { axis: "academics", level: null, points: null, note: "GPA не указан" };
  const level = levelByThresholds(g, STRENGTH_RULES.academics.gpa100);
  let points = piecewise(g, SP.gpa100.x, SP.gpa100.y);
  let note = `GPA ≈ ${Math.round(g)}/100`;
  // Оценки по предметам: профильные предметы весят больше среднего, спецпредметы по направлению — бонус.
  const s = gradesSummary(p.grades, profileMajors(p));
  if (s && gradesGpa100(p.grades) != null) {
    note = `средний ${gradeText(s.average, s.scale)} по ${s.count} предметам`;
    if (s.core.average100 != null) {
      const shift = (s.core.average100 - s.average100) * SUBJECT_RULES.coreShift;
      points += Math.max(-SUBJECT_RULES.coreShiftMax, Math.min(SUBJECT_RULES.coreShiftMax, shift));
      note += `, профильные ≈ ${Math.round(s.core.average100)}/100`;
    }
    const strongSpecial = s.special.filter((i) => s.core.keys.includes(i.key) && s.strongCore.includes(i)).length;
    points += Math.min(SUBJECT_RULES.specialBonusMax, strongSpecial * SUBJECT_RULES.specialBonus);
    if (strongSpecial) note += `, спецпредметы по направлению`;
  }
  return { axis: "academics", level, points: Math.round(Math.max(0, Math.min(100, points))), note };
}

/** Самый слабый профильный предмет (ниже порога) — для совета. */
function weakCoreTip(p: Profile): string | null {
  const s = gradesSummary(p.grades, profileMajors(p));
  const w = s?.weakCore.sort((a, b) => a.grade - b.grade)[0];
  if (!s || !w) return null;
  const name = w.key === "other" ? w.subject : SUBJECT_RU[w.key];
  return `«${name}» — профильный предмет для твоего направления, а оценка сейчас ${gradeText(w.grade, s.scale)}: подтяни её, вузы смотрят на этот предмет в первую очередь.`;
}

function tests(p: Profile): AxisResult {
  const parts: string[] = [];
  let best: StrengthLevel = 0;
  let pts = 0;
  const take = (v: number | null | undefined, th: readonly number[], curve: { x: readonly number[]; y: readonly number[] }, label: string) => {
    if (v == null) return;
    best = Math.max(best, levelByThresholds(v, th)) as StrengthLevel;
    pts = Math.max(pts, piecewise(v, curve.x, curve.y));
    parts.push(label);
  };
  take(p.ielts, STRENGTH_RULES.tests.ielts, SP.ielts, `IELTS ${p.ielts}`);
  take(p.sat, STRENGTH_RULES.tests.sat, SP.sat, `SAT ${p.sat}`);
  // Моки учитываются в силе профиля с пометкой, но не заменяют реальный балл.
  if (p.mockSat != null && (p.sat == null || p.mockSat > p.sat)) take(p.mockSat, STRENGTH_RULES.tests.sat, SP.sat, `SAT ≈ ${p.mockSat} по моку`);
  if (p.mockIelts != null && (p.ielts == null || p.mockIelts > p.ielts)) take(p.mockIelts, STRENGTH_RULES.tests.ielts, SP.ielts, `IELTS Reading ≈ ${p.mockIelts} по моку`);
  if (!parts.length) return { axis: "tests", level: 0, points: 0, note: "тесты ещё не сданы" };
  return { axis: "tests", level: best, points: Math.round(pts), note: parts.join(", ") };
}

function activities(p: Profile): AxisResult {
  let lvl: number = STRENGTH_RULES.activities.byLevel[p.bestAchievementLevel];
  if (p.activitiesCount >= STRENGTH_RULES.activities.manyActivities && lvl > 0) lvl = Math.min(3, lvl + 1);
  const note =
    p.bestAchievementLevel === "none"
      ? "пока нет активностей и проектов"
      : `${p.activitiesCount} активн., высший уровень: ${levelWord(p.bestAchievementLevel)}`;
  const pts = Math.min(100, SP.activityBase[p.bestAchievementLevel] + Math.min(SP.perActivityMax, p.activitiesCount * SP.perActivity));
  return { axis: "activities", level: lvl as StrengthLevel, points: pts, note };
}

function levelWord(l: Profile["bestAchievementLevel"]): string {
  return { none: "нет", school: "школа", city: "город/область", national: "республика", international: "международный" }[l];
}

function leadership(p: Profile): AxisResult {
  if (!p.ledSomething) return { axis: "leadership", level: 0, points: 0, note: "нет инициатив, которые вы вели сами" };
  // Лидерство сильнее, если за ним есть результат уровня города и выше.
  const lvl: StrengthLevel =
    p.bestAchievementLevel === "international" || p.bestAchievementLevel === "national" ? 3 : p.bestAchievementLevel === "city" ? 2 : 1;
  return { axis: "leadership", level: lvl, points: SP.leadership[p.bestAchievementLevel], note: "есть собственная инициатива" };
}

function essays(p: Profile): AxisResult {
  const states = [p.essays, p.recommendations];
  if (states.every((s) => s === "not_assessed"))
    return { axis: "essays", level: null, points: null, note: "не оценено: эссе и рекомендации" };
  const map = { not_assessed: null, weak: 1, ok: 2, strong: 3 } as const;
  const vals = states.map((s) => map[s]).filter((v): v is 1 | 2 | 3 => v != null);
  const lvl = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) as StrengthLevel;
  const q = states.filter((s): s is "weak" | "ok" | "strong" => s !== "not_assessed").map((s) => SP.qualitative[s]);
  return { axis: "essays", level: lvl, points: Math.round(q.reduce((a, b) => a + b, 0) / q.length), note: p.essays === "not_assessed" ? "эссе не оценено" : "оценено" };
}

/** Совет по оси — по реальным цифрам ученика (не предлагать IELTS 6.5+, если у него уже 7). */
function tipFor(axis: AxisResult["axis"], p: Profile): string {
  switch (axis) {
    case "academics": {
      const g = profileGpa100(p);
      if (g == null) return "Укажи средний балл или подключи eMaktab / EMIS — без GPA подбор вузов неточный.";
      if (g < 88) return `Подтяни оценки по профильным предметам: GPA ≈ ${Math.round(g)} из 100, а для большинства грантов нужно 88+.`;
      if (g < 95) return `GPA ≈ ${Math.round(g)} из 100 — хорошо. До уровня сильнейших (95+) держи пятёрки по профильным предметам.`;
      return "GPA отличный — сохрани его до выпуска: вузы смотрят оценки за последние годы.";
    }
    case "tests": {
      const { ielts, sat } = p;
      if (ielts == null && sat == null) return "Запишись на IELTS с целью 6.5+: без него большинство программ и грантов недоступны.";
      if (ielts != null && ielts < 6.5) return `Пересдай IELTS: сейчас ${ielts}, а для большинства грантов нужно 6.5+.`;
      if (sat != null && sat < 1300) return `SAT ${sat}: для грантов в США цель — 1400+, пересдача обычно даёт +50–100 баллов.`;
      if (ielts != null && ielts < 7.5) return `IELTS ${ielts} уже открывает большинство программ. Чтобы усилить тесты — IELTS 7.5+${sat == null ? " или SAT 1300+ для вузов США" : ""}.`;
      if (sat == null) return "IELTS отличный. Для вузов США и топовых программ добавь SAT с целью 1400+.";
      return "Тесты — твоя сильная сторона. Следи, чтобы сертификаты были действующими: IELTS — 2 года.";
    }
    case "activities":
      if (p.bestAchievementLevel === "none") return "Начни 1–2 активности по специальности: олимпиада, проект или конкурс — с результатом, который можно показать.";
      if (p.bestAchievementLevel === "school") return "Доведи активности до уровня города или выше — олимпиада, проект, конкурс.";
      if (p.bestAchievementLevel === "city") return "Следующий шаг — результат республиканского уровня: заключительный этап олимпиады или национальный конкурс.";
      return "Сильные достижения — опиши их цифрами в портфолио и эссе: место, масштаб, что изменилось.";
    case "leadership":
      return p.ledSomething
        ? "Покажи результат своей инициативы цифрами: сколько людей участвовало и что изменилось."
        : "Запусти свою инициативу: клуб, волонтёрский проект или мероприятие в школе — и посчитай, скольким людям она помогла.";
    case "essays":
      if (p.essays === "strong") return "Эссе сильное — подготовь версии под каждый вуз и попроси учителей о рекомендациях заранее.";
      if (p.essays === "ok") return "Доведи эссе до сильного: одна конкретная история вместо перечисления достижений.";
      if (p.essays === "weak") return "Перепиши эссе: начни с момента, который тебя изменил, и проверь его в разделе «Эссе».";
      return "Начни личное эссе: напиши черновик и попроси ИИ-помощника проверить структуру и клише.";
  }
}

export function scoreProfile(p: Profile): StrengthResult {
  const axes = [academics(p), tests(p), activities(p), leadership(p), essays(p)];
  // Итог 1–100: взвешенное среднее оценённых осей. Неоценённые оси не тянут вниз, но показаны как «не оценено».
  const scored = axes.filter((a) => a.points != null);
  const wsum = scored.reduce((s, a) => s + SP.weights[a.axis], 0);
  const raw = wsum ? scored.reduce((s, a) => s + (a.points as number) * SP.weights[a.axis], 0) / wsum : 0;
  const score = Math.max(1, Math.min(100, Math.round(raw)));
  const overall = levelOfPoints(score);
  // 3 совета по самым слабым осям (не оценённые эссе — в конце, но учитываются).
  const ranked = [...axes].sort((a, b) => (a.level ?? 1.5) - (b.level ?? 1.5));
  const weak = weakCoreTip(p);
  const tips = ranked.slice(0, 3).map((a) => (a.axis === "academics" && weak ? weak : tipFor(a.axis, p)));
  if (weak && !tips.includes(weak)) tips[tips.length - 1] = weak;
  return { axes, overall, score, tips };
}
