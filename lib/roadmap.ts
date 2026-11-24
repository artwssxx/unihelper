import { PROGRAMS } from "@/data/programs";
import { scoreProfile } from "./scoring/strength";
import type { CountryCode, Profile } from "./types";

// Дорожная карта: шаблоны от эксперта (не фантазия ИИ), даты от класса ученика и целевых стран.
// Проверенных дедлайнов в базе пока нет, поэтому все сроки заявок — «ориентировочно, по прошлому году».

export type Track = "tests" | "activities" | "documents" | "applications";
export const TRACKS: { id: Track; label: string }[] = [
  { id: "tests", label: "Тесты" },
  { id: "activities", label: "Активности" },
  { id: "documents", label: "Документы" },
  { id: "applications", label: "Заявки" },
];

export interface RoadmapItem {
  id: string;
  title: string;
  track: Track;
  /** Первый день месяца, YYYY-MM-DD. */
  due: string;
  estimated: boolean;
  link?: string;
  source: "auto" | "manual";
}

/** Месяц подачи относительно сентября учебного года выпуска (0 = сентябрь). Ориентировочно. */
const DEADLINE_OFFSET: Partial<Record<CountryCode, { offset: number; label: string }>> = {
  US: { offset: 4, label: "вузы США (Regular Decision)" },
  AE: { offset: 4, label: "NYU Abu Dhabi" },
  HU: { offset: 4, label: "Stipendium Hungaricum" },
  TR: { offset: 5, label: "Türkiye Bursları" },
  KR: { offset: 1, label: "GKS / вузы Кореи" },
  JP: { offset: 8, label: "MEXT (через посольство)" },
  IT: { offset: 6, label: "вузы Италии и стипендия DSU" },
  DE: { offset: 10, label: "вузы Германии" },
  UZ: { offset: 10, label: "частные вузы Узбекистана" },
};

const pad = (n: number) => String(n).padStart(2, "0");
function monthDate(year: number, month0: number): string {
  const y = year + Math.floor(month0 / 12);
  const m = ((month0 % 12) + 12) % 12;
  return `${y}-${pad(m + 1)}-01`;
}

/** Год, в сентябре которого начинается сезон подачи для ученика этого класса. */
export function cycleStartYear(grade: number, now: Date): number {
  const schoolYearEnd = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const gradYear = schoolYearEnd + Math.max(0, 11 - Math.min(grade, 11));
  return gradYear - 1;
}

export function buildRoadmap(profile: Profile, myPrograms: string[] = [], now = new Date(), programs = PROGRAMS): RoadmapItem[] {
  const y = cycleStartYear(profile.grade, now);
  const at = (offset: number) => monthDate(y, 8 + offset); // 8 = сентябрь
  const items: RoadmapItem[] = [];
  const nowIso = monthDate(now.getFullYear(), now.getMonth());
  // Подготовительный шаг, чей расчётный месяц уже прошёл, переносим на текущий: его всё ещё нужно сделать.
  const add = (id: string, title: string, track: Track, due: string, estimated: boolean, link?: string) => {
    if (!items.some((i) => i.id === id)) items.push({ id, title, track, due: due < nowIso ? nowIso : due, estimated, link, source: "auto" });
  };

  const countries = new Set<CountryCode>([...profile.targetCountries, "UZ"]);
  for (const pid of myPrograms) {
    const p = programs.find((x) => x.id === pid);
    if (p) countries.add(p.country);
  }
  const deadlines = [...countries]
    .map((c) => ({ c, d: DEADLINE_OFFSET[c] }))
    .filter((x): x is { c: CountryCode; d: { offset: number; label: string } } => Boolean(x.d))
    .sort((a, b) => a.d.offset - b.d.offset);
  const nowOffset = (now.getFullYear() - y) * 12 + now.getMonth() - 8;
  // Ближайший ещё не прошедший срок подачи (прошедшие переносятся на следующий набор).
  const upcoming = deadlines.map((x) => (x.d.offset < nowOffset ? x.d.offset + 12 : x.d.offset)).sort((a, b) => a - b);
  const earliest = upcoming[0] ?? 4;

  // Заявки и документы — от дедлайнов.
  for (const { c, d } of deadlines) {
    // Срок этого набора уже прошёл → целимся в следующий набор.
    const next = at(d.offset) < nowIso;
    const off = next ? d.offset + 12 : d.offset;
    add(`apply-${c}`, `Подать заявку: ${d.label}${next ? " (следующий набор)" : ""}`, "applications", at(off), true, "/programs");
    add(`docs-${c}`, `Собрать документы: ${d.label}`, "documents", at(off - 1), true, "/programs");
  }
  add("recs", "Попросить рекомендации у учителей", "documents", at(earliest - 2), true, "/essays");
  add("essay-draft", "Черновик личного эссе", "documents", at(earliest - 3), true, "/essays");
  add("transcript", "Перевести и заверить табель / транскрипт", "documents", at(earliest - 2), true);
  add("passport", "Проверить загранпаспорт (срок действия)", "documents", at(earliest - 4), true);

  // Тесты.
  const needsSat = countries.has("US") || countries.has("AE");
  const nowMonth = monthDate(now.getFullYear(), now.getMonth());
  if (profile.ielts == null) {
    add("ielts-mock", "IELTS Reading мок в хард-режиме", "tests", nowMonth, false, "/mocks");
    add("ielts-exam", "Сдать IELTS (цель 6.5+)", "tests", at(earliest - 4), true, "/mocks");
  }
  if (needsSat && profile.sat == null) {
    add("sat-mock", "SAT-мок в хард-режиме", "tests", nowMonth, false, "/mocks");
    add("sat-exam", "Сдать SAT", "tests", at(earliest - 3), true, "/mocks");
  }
  add("writing-mock", "IELTS Writing: Task 2 с ИИ-оценкой", "tests", monthDate(now.getFullYear(), now.getMonth() + 1), false, "/mocks");

  // Активности — по слабым осям Profile Strength.
  const s = scoreProfile(profile);
  const lvl = (axis: string) => s.axes.find((a) => a.axis === axis)?.level ?? 0;
  if ((lvl("activities") ?? 0) < 2) {
    add("event-major", "Найти олимпиаду или проект по специальности", "activities", nowMonth, false, "/events");
    add("event-result", "Довести активность до результата уровня города+", "activities", at(Math.min(earliest - 5, -1)), true, "/events");
  }
  if ((lvl("leadership") ?? 0) < 2) add("lead", "Запустить свою инициативу (клуб, проект)", "activities", monthDate(now.getFullYear(), now.getMonth() + 2), false, "/events");
  add("volunteer", "Волонтёрство: 2–3 часа в неделю", "activities", monthDate(now.getFullYear(), now.getMonth() + 1), false, "/events");
  add("lesson-essay", "Урок: личное эссе без клише", "documents", nowMonth, false, "/lessons/l-essay");
  add("portfolio", "Собрать сайт-портфолио", "documents", at(earliest - 2), true, "/portfolio");

  return items.sort((a, b) => a.due.localeCompare(b.due) || a.track.localeCompare(b.track));
}

export type StepStatus = "todo" | "doing" | "done" | "overdue";

export function effectiveStatus(item: RoadmapItem, stored: "todo" | "doing" | "done" | undefined, now = new Date()): StepStatus {
  const st = stored ?? "todo";
  if (st === "done") return "done";
  const end = new Date(item.due);
  end.setMonth(end.getMonth() + 1);
  return end < now ? "overdue" : st;
}

export function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}
