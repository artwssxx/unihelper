import type { AxisResult, Profile, StrengthLevel, StrengthResult } from "../types";
import { STRENGTH_RULES } from "./config";

export const LEVEL_NAMES = ["начальный", "развивающийся", "сильный", "очень сильный"] as const;

export function gpaTo100(gpa: number | null, scale: 5 | 100): number | null {
  if (gpa == null || Number.isNaN(gpa)) return null;
  if (scale === 100) return Math.max(0, Math.min(100, gpa));
  // 5-балльная: 5.0 → 100, 4.0 → 80, 3.0 → 60
  return Math.max(0, Math.min(100, (gpa / 5) * 100));
}

function levelByThresholds(value: number, thresholds: readonly number[]): StrengthLevel {
  let lvl = 0;
  thresholds.forEach((t, i) => {
    if (value >= t) lvl = i + 1;
  });
  return lvl as StrengthLevel;
}

function academics(p: Profile): AxisResult {
  const g = gpaTo100(p.gpa, p.gpaScale);
  if (g == null) return { axis: "academics", level: null, note: "GPA не указан" };
  const level = levelByThresholds(g, STRENGTH_RULES.academics.gpa100);
  return { axis: "academics", level, note: `GPA ≈ ${Math.round(g)}/100` };
}

function tests(p: Profile): AxisResult {
  const parts: string[] = [];
  let best: StrengthLevel = 0;
  if (p.ielts != null) {
    best = Math.max(best, levelByThresholds(p.ielts, STRENGTH_RULES.tests.ielts)) as StrengthLevel;
    parts.push(`IELTS ${p.ielts}`);
  }
  if (p.sat != null) {
    best = Math.max(best, levelByThresholds(p.sat, STRENGTH_RULES.tests.sat)) as StrengthLevel;
    parts.push(`SAT ${p.sat}`);
  }
  if (!parts.length) return { axis: "tests", level: 0, note: "тесты ещё не сданы" };
  return { axis: "tests", level: best, note: parts.join(", ") };
}

function activities(p: Profile): AxisResult {
  let lvl: number = STRENGTH_RULES.activities.byLevel[p.bestAchievementLevel];
  if (p.activitiesCount >= STRENGTH_RULES.activities.manyActivities && lvl > 0) lvl = Math.min(3, lvl + 1);
  const note =
    p.bestAchievementLevel === "none"
      ? "пока нет активностей и проектов"
      : `${p.activitiesCount} активн., высший уровень: ${levelWord(p.bestAchievementLevel)}`;
  return { axis: "activities", level: lvl as StrengthLevel, note };
}

function levelWord(l: Profile["bestAchievementLevel"]): string {
  return { none: "нет", school: "школа", city: "город/область", national: "республика", international: "международный" }[l];
}

function leadership(p: Profile): AxisResult {
  if (!p.ledSomething) return { axis: "leadership", level: 0, note: "нет инициатив, которые вы вели сами" };
  // Лидерство сильнее, если за ним есть результат уровня города и выше.
  const lvl: StrengthLevel =
    p.bestAchievementLevel === "international" || p.bestAchievementLevel === "national" ? 3 : p.bestAchievementLevel === "city" ? 2 : 1;
  return { axis: "leadership", level: lvl, note: "есть собственная инициатива" };
}

function essays(p: Profile): AxisResult {
  const states = [p.essays, p.recommendations];
  if (states.every((s) => s === "not_assessed"))
    return { axis: "essays", level: null, note: "не оценено: эссе и рекомендации" };
  const map = { not_assessed: null, weak: 1, ok: 2, strong: 3 } as const;
  const vals = states.map((s) => map[s]).filter((v): v is 1 | 2 | 3 => v != null);
  const lvl = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) as StrengthLevel;
  return { axis: "essays", level: lvl, note: p.essays === "not_assessed" ? "эссе не оценено" : "оценено" };
}

const TIP_BY_AXIS: Record<AxisResult["axis"], string> = {
  academics: "Подтяните оценки по профильным предметам: GPA — первое, что смотрят все программы.",
  tests: "Запишитесь на IELTS с целью 6.5+: без него большинство программ и грантов недоступны.",
  activities: "Углубите 1–2 активности по специальности: доведите их до результата уровня города или выше — олимпиада, проект, конкурс.",
  leadership: "Запустите свою инициативу: клуб, волонтёрский проект или мероприятие в школе — и посчитайте, скольким людям она помогла.",
  essays: "Начните личное эссе: напишите черновик и попросите ИИ-помощника проверить структуру и клише.",
};

export function scoreProfile(p: Profile): StrengthResult {
  const axes = [academics(p), tests(p), activities(p), leadership(p), essays(p)];
  const assessed = axes.filter((a) => a.level != null).map((a) => a.level as number);
  const overall = (assessed.length ? Math.floor(assessed.reduce((a, b) => a + b, 0) / assessed.length) : 0) as StrengthLevel;
  // 3 совета по самым слабым осям (не оценённые эссе — в конце, но учитываются).
  const ranked = [...axes].sort((a, b) => (a.level ?? 1.5) - (b.level ?? 1.5));
  const tips = ranked.slice(0, 3).map((a) => TIP_BY_AXIS[a.axis]);
  return { axes, overall, tips };
}
