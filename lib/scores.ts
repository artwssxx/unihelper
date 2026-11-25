// Результаты экзаменов ученика (официальные или «со слов»): IELTS и SAT.
// Здесь — чистая логика без сети: Overall по правилам IELTS, разбор текста, разбор по правилам без ИИ.

export type ScoreExam = "ielts" | "sat";
export type IeltsSection = "listening" | "reading" | "writing" | "speaking";
export type SatSection = "math" | "rw";

export interface IeltsScores { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null; overall?: number | null }
export interface SatScores { math?: number | null; rw?: number | null; total?: number | null }

export interface ScoreAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  plan: { title: string; weeks: number; actions: string[] }[];
  targetNote: string;
  ai: boolean;
}

export interface ScoreRecord {
  id: string;
  exam: ScoreExam;
  /** YYYY-MM-DD */
  date: string;
  kind: "official" | "self";
  source: "file" | "text" | "manual";
  ielts?: IeltsScores;
  sat?: SatScores;
  analysis?: ScoreAnalysis;
}

export const IELTS_SECTIONS: { id: IeltsSection; label: string }[] = [
  { id: "listening", label: "Listening" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
];

/** Округление Overall по правилам IELTS: .25 → .5, .75 → следующий целый. */
export function ieltsOverall(s: IeltsScores): number | null {
  const v = IELTS_SECTIONS.map((x) => s[x.id]).filter((x): x is number => typeof x === "number");
  if (v.length !== 4) return null;
  const avg = v.reduce((a, b) => a + b, 0) / 4;
  return Math.floor(avg * 4 + 1e-9) % 2 === 1 ? Math.ceil(avg * 2) / 2 : Math.round(avg * 2) / 2;
}

const isBand = (v: unknown): v is number => typeof v === "number" && v >= 0 && v <= 9 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
const isSatSection = (v: unknown): v is number => typeof v === "number" && v >= 200 && v <= 800 && v % 10 === 0;
const isSatTotal = (v: unknown): v is number => typeof v === "number" && v >= 400 && v <= 1600 && v % 10 === 0;

/** Оставить только правдоподобные значения (ИИ или ученик могли ошибиться). */
export function cleanIelts(s: IeltsScores): IeltsScores {
  const out: IeltsScores = {};
  for (const k of ["listening", "reading", "writing", "speaking", "overall"] as const) if (isBand(s[k])) out[k] = s[k];
  if (out.overall == null) out.overall = ieltsOverall(out);
  return out;
}
export function cleanSat(s: SatScores): SatScores {
  const out: SatScores = {};
  if (isSatSection(s.math)) out.math = s.math;
  if (isSatSection(s.rw)) out.rw = s.rw;
  if (isSatTotal(s.total)) out.total = s.total;
  else if (out.math != null && out.rw != null) out.total = out.math + out.rw;
  return out;
}

const num = (s: string) => Number(s.replace(",", "."));

/** Числа из свободного описания: «Listening 7.5, Reading 6, W 5.5, S 6.5» или «Math 650, RW 610, total 1260». */
export function parseScoreText(text: string): { ielts: IeltsScores; sat: SatScores } {
  const t = ` ${text.toLowerCase().replace(/ё/g, "е")} `;
  const grab = (re: RegExp) => {
    const m = t.match(re);
    return m ? num(m[1]) : null;
  };
  const band = "(\\d(?:[.,]5|[.,]0)?)";
  const ielts = cleanIelts({
    listening: grab(new RegExp(`(?:listening|листенинг|аудирование|\\bl)\\s*[:=\\-]?\\s*${band}\\b`)),
    reading: grab(new RegExp(`(?:reading|ридинг|чтение|\\br)\\s*[:=\\-]?\\s*${band}\\b`)),
    writing: grab(new RegExp(`(?:writing|райтинг|письмо|\\bw)\\s*[:=\\-]?\\s*${band}\\b`)),
    speaking: grab(new RegExp(`(?:speaking|спикинг|говорение|\\bs)\\s*[:=\\-]?\\s*${band}\\b`)),
    overall: grab(new RegExp(`(?:overall|общий|итог|оверол)\\s*(?:band)?\\s*[:=\\-]?\\s*${band}\\b`)),
  });
  const sat = cleanSat({
    math: grab(/(?:math|матем\S*)\s*[:=\-]?\s*(\d{3})\b/),
    rw: grab(/(?:reading\s*(?:and|&)\s*writing|\brw\b|\bebrw\b|english)\s*[:=\-]?\s*(\d{3})\b/),
    total: grab(/(?:total|итог\S*|всего|sat)\s*[:=\-]?\s*(\d{3,4})\b/),
  });
  return { ielts, sat };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Дата экзамена из текста отчёта: 2026-10-12, 12/10/2026, 12/OCT/2026, 12 October 2026, October 4, 2026. */
export function parseScoreDate(text: string): string | null {
  const t = text.toLowerCase();
  const ok = (y: number, m: number, d: number) => {
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  const mon = (w: string) => MONTHS.indexOf(w.slice(0, 3)) + 1;
  let m = t.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/\b(\d{1,2})[\s/.\-]+([a-z]{3,9})[\s/.\-,]+(20\d\d)\b/);
  if (m && mon(m[2]) > 0) return ok(+m[3], mon(m[2]), +m[1]);
  m = t.match(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d\d)\b/);
  if (m && mon(m[1]) > 0) return ok(+m[3], mon(m[1]), +m[2]);
  m = t.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d\d)\b/);
  if (m) return ok(+m[3], +m[2], +m[1]);
  return null;
}

const IELTS_TIPS: Record<IeltsSection, string[]> = {
  listening: ["Каждый день один раздел Listening с проверкой по транскрипту", "Тренируй запись чисел, дат и имён по буквам — там чаще всего теряют баллы"],
  reading: ["Решай по одному тексту в день на время (20 минут)", "Для True/False/Not Given ищи точное место в тексте, где это написано"],
  writing: ["Task 2: план из 4 абзацев за 5 минут, потом текст", "Проверяй эссе в UniHelper: ИИ покажет слабый критерий с цитатами"],
  speaking: ["Записывай ответы Part 2 на телефон по 2 минуты и переслушивай", "Учи связки и примеры под частые темы: учёба, город, технологии"],
};

/** Разбор без ИИ: слабые и сильные секции, разрыв до цели, план по неделям. */
export function ruleAnalysis(r: Pick<ScoreRecord, "exam" | "ielts" | "sat">, target?: { ielts?: number | null; sat?: number | null }): ScoreAnalysis {
  if (r.exam === "ielts") {
    const s = r.ielts ?? {};
    const secs = IELTS_SECTIONS.filter((x) => typeof s[x.id] === "number").map((x) => ({ ...x, v: s[x.id] as number }));
    const sorted = [...secs].sort((a, b) => a.v - b.v);
    const weak = sorted.filter((x) => sorted.length && x.v <= sorted[0].v + 0.25).slice(0, 2);
    const strong = sorted.slice(-1).filter((x) => !weak.includes(x));
    const overall = s.overall ?? ieltsOverall(s);
    const gap = target?.ielts && overall != null ? target.ielts - overall : null;
    return {
      summary: overall != null ? `Overall ${overall}${secs.length === 4 ? ` (L ${s.listening}, R ${s.reading}, W ${s.writing}, S ${s.speaking})` : ""}.` : "Укажи баллы по секциям — посчитаем Overall и разрыв до цели.",
      strengths: strong.map((x) => `${x.label}: ${x.v} — самая сильная секция`),
      weaknesses: weak.map((x) => `${x.label}: ${x.v} — тянет Overall вниз`),
      plan: weak.length
        ? weak.map((x, i) => ({ title: `${x.label}: +0.5 band`, weeks: i === 0 ? 4 : 3, actions: IELTS_TIPS[x.id] }))
        : [{ title: "Пройди мок IELTS Reading и Writing", weeks: 1, actions: ["Мок покажет слабые типы вопросов и критерии"] }],
      targetNote:
        gap == null ? "Добавь программы в свой список — сравним с их требованиями." : gap <= 0 ? `Цель ${target!.ielts} уже достигнута — можно подаваться, а пересдавать стоит только ради гранта.` : `До цели ${target!.ielts} не хватает ${gap} band.`,
      ai: false,
    };
  }
  const s = r.sat ?? {};
  const total = s.total ?? (s.math != null && s.rw != null ? s.math + s.rw : null);
  const weakSec = s.math != null && s.rw != null ? (s.math < s.rw ? "Math" : "Reading & Writing") : null;
  const gap = target?.sat && total != null ? target.sat - total : null;
  return {
    summary: total != null ? `SAT ${total}${s.math != null && s.rw != null ? ` (Math ${s.math}, RW ${s.rw})` : ""}.` : "Укажи баллы по секциям — посчитаем сумму и разрыв до цели.",
    strengths: weakSec ? [`${weakSec === "Math" ? "Reading & Writing" : "Math"} — сильнее`] : [],
    weaknesses: weakSec ? [`${weakSec} — больше всего баллов можно добрать здесь`] : [],
    plan: [
      { title: weakSec === "Math" ? "Math: алгебра и Advanced Math" : "Reading & Writing: правила и переходы", weeks: 4, actions: ["Два адаптивных мока в неделю в UniHelper", "Разбор каждой ошибки по теме — уроки подберутся автоматически"] },
      { title: "Официальный пробник в Bluebook", weeks: 1, actions: ["Полный тест в условиях экзамена за 1–2 недели до даты"] },
    ],
    targetNote: gap == null ? "Добавь программы в свой список — сравним с их типичным SAT." : gap <= 0 ? `Типичный SAT поступивших (${target!.sat}) уже достигнут.` : `До типичного SAT поступивших (${target!.sat}) не хватает ${gap}.`,
    ai: false,
  };
}

// ── Автопроверка загруженного сертификата (анкета, профиль) ──

export interface CertCheck {
  status: "verified" | "warn" | "fail";
  score: number | null;
  notes: string[];
}

/**
 * Проверка сертификата IELTS/SAT по распознанному результату: официальный ли отчёт, есть ли дата и не просрочен ли
 * (IELTS — 2 года, SAT — 5 лет: так считает большинство вузов), сходятся ли секции с итогом. Балл берём только итоговый.
 */
export function certificateCheck(r: { exam: ScoreExam; kind: "official" | "self"; date: string | null; ielts?: IeltsScores; sat?: SatScores }, now = new Date()): CertCheck {
  const notes: string[] = [];
  let score: number | null = null;
  let bad = false;
  if (r.exam === "ielts") {
    const s = r.ielts ?? {};
    score = s.overall ?? ieltsOverall(s);
    const calc = ieltsOverall(s);
    if (score != null && calc != null && calc !== score) { notes.push(`Overall ${score} не сходится с баллами секций (по ним выходит ${calc}) — проверь.`); bad = true; }
  } else {
    const s = r.sat ?? {};
    score = s.total ?? (s.math != null && s.rw != null ? s.math + s.rw : null);
    if (s.total != null && s.math != null && s.rw != null && s.math + s.rw !== s.total) { notes.push(`Сумма секций ${s.math + s.rw} не равна итогу ${s.total} — проверь.`); bad = true; }
  }
  if (score == null) return { status: "fail", score: null, notes: ["Не нашли итоговый балл. Загрузи отчёт целиком — там, где видно Overall / Total."] };
  if (r.kind !== "official") { notes.push("Не похоже на официальный отчёт (IELTS TRF или отчёт College Board) — балл сохраним как «со слов»."); bad = true; }
  if (!r.date) { notes.push("Не видна дата экзамена."); bad = true; }
  else {
    const years = (now.getTime() - Date.parse(r.date)) / (365.25 * 86400_000);
    const limit = r.exam === "ielts" ? 2 : 5;
    if (years > limit) { notes.push(`Экзамену больше ${limit} лет — большинство вузов такой результат не примут.`); bad = true; }
    if (years < -0.05) { notes.push("Дата экзамена в будущем — проверь отчёт."); bad = true; }
  }
  return { status: bad ? "warn" : "verified", score, notes };
}
