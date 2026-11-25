// Оценки по предметам: распознавание предметов (ru / uz латиница и кириллица / en), средний балл,
// профильные предметы по направлениям, разбор вставленной таблицы и отметок из дневника.
// Чистые функции без сети — их использует и сервер (импорт), и подсчёт силы профиля.

import { ALIASES } from "./gradeAliases";
import type { Major } from "./types";

export type SubjectKey =
  | "math" | "physics" | "chemistry" | "biology" | "informatics" | "english" | "foreign" | "russian" | "native"
  | "literature" | "history" | "geography" | "economics" | "law" | "drawing" | "art" | "music" | "pe" | "tech"
  | "military" | "upbringing" | "other";

export type GradeScale = 5 | 10 | 100;
export type GradeSource = "emaktab" | "emis" | "photo" | "text" | "manual";

export interface GradeItem {
  /** Название как в источнике или как ввёл ученик. */
  subject: string;
  key: SubjectKey;
  /** Оценка по шкале scale (средняя за период). */
  grade: number;
  /** Спецпредмет: углублённое изучение, профильный класс лицея. */
  special?: boolean;
  /** Сколько отметок за период (при импорте из дневника). */
  count?: number;
}

export interface Grades {
  items: GradeItem[];
  scale: GradeScale;
  source: GradeSource;
  updatedAt: string;
  /** Например «2026/27 учебный год». */
  period?: string;
  /** Считать GPA по этим оценкам (по умолчанию да). */
  useForGpa?: boolean;
}

/** Название предмета по-русски — для ручного ввода и подписей. */
export const SUBJECT_RU: Record<SubjectKey, string> = {
  math: "Математика", physics: "Физика", chemistry: "Химия", biology: "Биология", informatics: "Информатика",
  english: "Английский язык", foreign: "Иностранный язык", russian: "Русский язык", native: "Родной язык",
  literature: "Литература", history: "История", geography: "География", economics: "Экономика", law: "Право",
  drawing: "Черчение", art: "Изобразительное искусство", music: "Музыка", pe: "Физкультура", tech: "Технология",
  military: "Допризывная подготовка", upbringing: "Воспитание", other: "Другой предмет",
};

/** Не входят в средний балл (как и в табеле для вузов обычно не считают). */
export const NON_ACADEMIC: ReadonlySet<SubjectKey> = new Set(["music", "pe", "tech", "military", "upbringing", "art"]);

/** Профильные предметы направления: на них смотрят вузы в первую очередь. */
export const MAJOR_SUBJECTS: Record<Major, SubjectKey[]> = {
  cs: ["math", "informatics", "physics"],
  engineering: ["math", "physics", "drawing", "informatics"],
  business: ["math", "economics", "english"],
  economics: ["math", "economics", "english"],
  medicine: ["biology", "chemistry"],
  ir: ["history", "english", "law", "geography"],
  design: ["art", "drawing"],
  natural_sciences: ["math", "physics", "chemistry", "biology"],
};

const normName = (s: string) =>
  s.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'").replace(/\s+/g, " ").trim();

/** Ключ предмета по названию на любом из языков; неизвестный — "other". */
export function subjectKey(name: string): SubjectKey {
  const n = normName(name);
  if (!n) return "other";
  for (const [key, words] of ALIASES) {
    for (const w of words) {
      // Короткие латинские слова (art, ict, law, math) — только целым словом, чтобы «Smart» не стал искусством.
      if (w.length <= 4 && /^[a-z]+$/.test(w)) {
        if (new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(n)) return key;
      } else if (n.includes(w)) return key;
    }
  }
  return "other";
}

export function to100(grade: number, scale: GradeScale): number {
  const v = scale === 5 ? (grade / 5) * 100 : scale === 10 ? grade * 10 : grade;
  return Math.max(0, Math.min(100, v));
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface GradesSummary {
  /** Средний по общеобразовательным предметам, по шкале оценок. */
  average: number;
  average100: number;
  scale: GradeScale;
  /** Сколько предметов вошло в средний. */
  count: number;
  /** Профильные предметы для выбранных направлений. */
  core: { keys: SubjectKey[]; items: GradeItem[]; average100: number | null };
  weakCore: GradeItem[];
  strongCore: GradeItem[];
  special: GradeItem[];
  /** Три самых сильных предмета. */
  strongest: GradeItem[];
}

export const GRADE_RULES = {
  /** С какого числа предметов средний по оценкам заменяет введённый вручную GPA. */
  minSubjectsForGpa: 3,
  weakCore100: 70,
  strongCore100: 90,
} as const;

/** Профильные предметы для набора направлений (без повторов, в порядке направлений). */
export function coreSubjects(majors: Major[]): SubjectKey[] {
  return [...new Set(majors.flatMap((m) => MAJOR_SUBJECTS[m] ?? []))];
}

export function gradesSummary(g: Grades | null | undefined, majors: Major[]): GradesSummary | null {
  if (!g?.items?.length) return null;
  const valid = g.items.filter((i) => Number.isFinite(i.grade) && i.grade > 0);
  const academic = valid.filter((i) => !NON_ACADEMIC.has(i.key));
  const base = academic.length ? academic : valid;
  const a = avg(base.map((i) => i.grade));
  if (a == null) return null;
  const keys = coreSubjects(majors);
  // Один предмет может встречаться несколько раз (алгебра и геометрия → математика): берём все строки.
  const coreItems = valid.filter((i) => keys.includes(i.key));
  const core100 = avg(coreItems.map((i) => to100(i.grade, g.scale)));
  return {
    average: round2(a),
    average100: Math.round(to100(a, g.scale) * 10) / 10,
    scale: g.scale,
    count: base.length,
    core: { keys, items: coreItems, average100: core100 == null ? null : Math.round(core100 * 10) / 10 },
    weakCore: coreItems.filter((i) => to100(i.grade, g.scale) < GRADE_RULES.weakCore100),
    strongCore: coreItems.filter((i) => to100(i.grade, g.scale) >= GRADE_RULES.strongCore100),
    special: valid.filter((i) => i.special),
    strongest: [...academic].sort((x, y) => y.grade - x.grade).slice(0, 3),
  };
}

/** GPA (0–100) по оценкам, если их достаточно и ученик не отключил подсчёт; иначе null. */
export function gradesGpa100(g: Grades | null | undefined): number | null {
  if (!g || g.useForGpa === false) return null;
  const s = gradesSummary(g, []);
  return s && s.count >= GRADE_RULES.minSubjectsForGpa ? s.average100 : null;
}

export function detectScale(values: number[]): GradeScale {
  const max = Math.max(...values);
  return max <= 5 ? 5 : max <= 10 ? 10 : 100;
}

/** Отметки из дневника (предмет → отметки) → средние по предметам. Буквы и пропуски («н», «nb») не считаем. */
export function aggregateMarks(marks: { subject: string; value: string | number }[]): { items: GradeItem[]; scale: GradeScale } {
  const by = new Map<string, number[]>();
  for (const m of marks) {
    const v = typeof m.value === "number" ? m.value : Number(String(m.value).replace(",", ".").trim());
    if (!Number.isFinite(v) || v <= 0 || v > 100) continue;
    const name = m.subject.trim();
    if (!name) continue;
    by.set(name, [...(by.get(name) ?? []), v]);
  }
  const all = [...by.values()].flat();
  const scale = all.length ? detectScale(all) : 5;
  const items = [...by].map(([subject, vs]) => ({ subject, key: subjectKey(subject), grade: round2(avg(vs)!), count: vs.length }));
  items.sort((x, y) => x.subject.localeCompare(y.subject, "ru"));
  return { items, scale };
}

/**
 * Разбор вставленного текста: строка = предмет и числа (оценка, отметки или четверти).
 * «Matematika 5 4 5», «Алгебра — 4,75», «Физика\t4.6\t5», «1. Ingliz tili: 5, 5, 4».
 */
export function parseGradesText(text: string): { items: GradeItem[]; scale: GradeScale } | null {
  const rows: { subject: string; values: number[] }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/ /g, " ").trim();
    if (!line) continue;
    line = line.replace(/^\s*\d{1,2}\s*[.)]\s+/, ""); // нумерация строк
    const m = line.match(/^(.*?[\p{L}][\p{L}\s'ʻʼ‘’`().,&/-]*?)[\s:–—|-]*?((?:\d+(?:[.,]\d+)?[\s,;/|\t]*)+)\s*$/u);
    if (!m) continue;
    const subject = m[1].replace(/[\s:–—|-]+$/, "").trim();
    if (subject.replace(/[^\p{L}]/gu, "").length < 3) continue;
    let nums = m[2];
    // «5,4,5» и «5, 4» — запятые-разделители; «4,75» — десятичная запятая.
    if (/\d,\d+,\d/.test(nums) || /,\s/.test(nums)) nums = nums.replace(/,/g, " ");
    const values = (nums.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(",", "."))).filter((v) => v > 0 && v <= 100);
    if (values.length) rows.push({ subject, values });
  }
  if (!rows.length) return null;
  const scale = detectScale(rows.flatMap((r) => r.values));
  const items = rows.map((r) => ({ subject: r.subject, key: subjectKey(r.subject), grade: round2(avg(r.values)!), ...(r.values.length > 1 ? { count: r.values.length } : {}) }));
  // Одинаковые предметы (две таблицы подряд) — оставляем последнюю строку.
  const uniq = new Map(items.map((i) => [normName(i.subject), i]));
  return { items: [...uniq.values()], scale };
}

/** Класс из названия группы eMaktab/EMIS («10-A», «11 «Б» sinf», «2-kurs»): 8–11 класс, 12–13 = 1–2 курс. */
export function gradeFromGroup(name: string | null | undefined): number | null {
  if (!name) return null;
  const kurs = name.match(/([12])\s*[-–]?\s*(курс|kurs)/i);
  if (kurs) return 11 + Number(kurs[1]);
  const m = name.match(/(^|\D)(\d{1,2})(?!\d)/);
  const n = m ? Number(m[2]) : NaN;
  return n >= 8 && n <= 11 ? n : null;
}

/** Подпись оценки: «4.6 из 5». */
export const gradeText = (v: number, scale: GradeScale) => `${round2(v)} из ${scale}`;
