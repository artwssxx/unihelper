import "server-only";
import type { Diary, DiaryDay, DiaryLesson, DiaryPerson, DiarySubject } from "@/lib/diary";
import { subjectKey, type GradeItem } from "@/lib/grades";
import type { Lang } from "@/lib/i18n/translate";

// Импорт оценок из EMIS (система академических лицеев, emis.edu.uz) по логину и паролю лицеиста.
// Это тот же API, которым пользуется кабинет студента EMIS:
//   POST /api/v1/student-profiles/login/  {login, password} → result.access_token (заголовок Authorization как есть)
//   GET  /api/v1/student-profiles/profile/ → курс, группа, текущий семестр
//   GET  /api/v1/student-profiles/ratings/ → по семестрам: предмет, тип (углублённый и т. п.), текущий, промежуточный,
//        итоговый контроль и рейтинг семестра (5-балльная шкала)
//   GET  /api/v1/student-profiles/edu-subjects/{id}/ratings/?semester=N → отметки по датам (текущий, промежуточный, итоговый)
//   GET  /api/v1/student-profiles/class-schedules/?begin_date=DD.MM.YYYY&end_date=… → уроки, темы, файлы домашки
//   GET  /api/v1/student-profiles/attendance/?begin_date=…&end_date=… → пропуски
//   POST /api/v1/student-profiles/logout/ → токен больше не действует
// Пароль используется один раз и нигде не сохраняется. Для автозаполнения берём только имя, фамилию, регион,
// лицей, группу и курс; ПИНФЛ, паспорт, дату рождения и адрес не берём. Имена учителей не сохраняем.

const API = "https://emis.edu.uz/api/v1/student-profiles";
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

export type EmisResult =
  | { status: "ok"; items: GradeItem[]; scale: 5; period: string; grade: number | null; className: string | null; marks: number; diary: Diary; person: DiaryPerson }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

type Named = { uz?: string; ru?: string; en?: string } | string | null | undefined;
export interface EmisRating {
  edu_subject?: { name?: Named; edu_subject_type?: { name?: Named } | null } | null;
  rating?: number | null;
  current_rating?: number | null;
  midterm_exam_rating?: number | null;
  final_exam_rating?: number | null;
}

const nameOf = (n: Named, lang: Lang): string => {
  if (!n) return "";
  if (typeof n === "string") return n;
  return (n[lang] || n.uz || n.ru || n.en || "").replace(/\s+/g, " ").trim();
};
const num = (v: unknown) => (typeof v === "number" && v > 0 && v <= 5 ? v : null);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Оценка предмета за семестр: после итогового контроля — рейтинг семестра (официальная оценка);
 * до него — среднее текущего и промежуточного контроля (рейтинг без итогового занижен).
 */
export function semesterGrade(r: EmisRating): number | null {
  if (num(r.final_exam_rating) != null && num(r.rating) != null) return num(r.rating);
  const parts = [num(r.current_rating), num(r.midterm_exam_rating)].filter((x): x is number => x != null);
  return parts.length ? avg(parts) : null;
}

/** «Chuqurlashtirilgan fanlar» / «Углублённые» — спецпредмет лицея. */
const isAdvanced = (t: string) => /chuqurlashtirilgan|углубл|advanced|in-depth/i.test(t);

/** Предметы и оценки из ответа ratings/: по каждому предмету — среднее по семестрам с оценками. */
export function gradesFromEmis(results: unknown, lang: Lang): { items: GradeItem[]; semesters: number } {
  const semesters = Array.isArray(results) ? (results as unknown[]).filter(Array.isArray) as EmisRating[][] : [];
  const by = new Map<string, { subject: string; key: GradeItem["key"]; grades: number[]; special: boolean }>();
  let used = 0;
  for (const sem of semesters) {
    let any = false;
    for (const r of sem) {
      const g = semesterGrade(r);
      const subject = nameOf(r.edu_subject?.name, lang).replace(/^\d+\s*-\s*/, "");
      if (!subject) continue;
      const detect = [nameOf(r.edu_subject?.name, "uz"), nameOf(r.edu_subject?.name, "en"), subject]
        .map((n) => n.replace(/\s*\((rus|рус|russian|uz|o‘zbek)\)\s*/gi, " "));
      const key = detect.map(subjectKey).find((k) => k !== "other") ?? "other";
      const cur = by.get(subject.toLowerCase()) ?? { subject, key, grades: [], special: false };
      cur.special ||= isAdvanced(nameOf(r.edu_subject?.edu_subject_type?.name, "uz") + " " + nameOf(r.edu_subject?.edu_subject_type?.name, "ru"));
      if (g != null) {
        cur.grades.push(g);
        any = true;
      }
      by.set(subject.toLowerCase(), cur);
    }
    if (any) used++;
  }
  const items = [...by.values()]
    .filter((x) => x.grades.length)
    .map((x) => ({ subject: x.subject, key: x.key, grade: Math.round(avg(x.grades) * 100) / 100, count: x.grades.length, ...(x.special ? { special: true } : {}) }));
  return { items, semesters: used };
}

async function call(path: string, init: RequestInit & { token?: string } = {}): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const r = await fetch(`${API}/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { accept: "application/json", "user-agent": UA, ...(init.body ? { "content-type": "application/json" } : {}), ...(init.token ? { authorization: init.token } : {}) },
  });
  const body = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: r.status, body };
}

const ddmmyyyy = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
/** «25.11.2026» → «2026-11-25». */
export const isoFromDmy = (s: string | null | undefined) => {
  const m = s?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const cleanName = (n: string) => n.replace(/^\d+\s*-\s*/, "").replace(/\s+/g, " ").trim();

type Rec = Record<string, unknown>;
/** Расписание: дни с уроками (время по номеру пары, тема, вид занятия, файл домашки, отметка на уроке). */
export function daysFromSchedules(results: unknown, hours: unknown, lang: Lang): DiaryDay[] {
  const time = new Map<number, { start: string; end: string }>();
  for (const h of (Array.isArray(hours) ? hours : []) as Rec[]) if (typeof h.pair_number === "number") time.set(h.pair_number, { start: String(h.begin_time ?? ""), end: String(h.end_time ?? "") });
  const out: DiaryDay[] = [];
  for (const day of (Array.isArray(results) ? results : []) as Rec[]) {
    const date = isoFromDmy(day.date as string);
    if (!date) continue;
    const lessons: DiaryLesson[] = [];
    for (const c of (Array.isArray(day.classes) ? day.classes : []) as Rec[]) {
      const pair = typeof c.pair_number === "number" ? c.pair_number : null;
      for (const t of (Array.isArray(c.teachers) ? c.teachers : []) as Rec[]) {
        const subj = t.edu_subject as { name?: Named } | undefined;
        const subject = cleanName(nameOf(subj?.name, lang));
        if (!subject) continue;
        const topic = t.topic as Rec | null;
        const hw = typeof topic?.homework_file_url === "string" && /^https:\/\//.test(topic.homework_file_url) ? (topic.homework_file_url as string) : null;
        const rating = num(t.rating);
        lessons.push({
          n: pair != null ? pair + 1 : null,
          start: pair != null ? time.get(pair)?.start ?? null : null,
          end: pair != null ? time.get(pair)?.end ?? null : null,
          subject,
          room: ((t.room as Rec | null)?.name as string) ?? null,
          kind: ((t.class_type as Rec | null)?.name as string) ?? null,
          topic: typeof topic?.name === "string" ? topic.name.trim() || null : null,
          homework: null,
          homeworkUrl: hw,
          marks: rating != null ? [rating] : [],
          absent: false,
        });
      }
    }
    lessons.sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
    out.push({ date, lessons });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Разбивка предмета по видам контроля из edu-subjects/{id}/ratings/. */
export function partsFromSubjectRatings(raw: unknown): { parts: DiarySubject["parts"]; semesterRating: number | null } {
  const r = (raw as Rec | null)?.result as Rec | undefined;
  const parts: DiarySubject["parts"] = [];
  for (const g of (Array.isArray(r?.ratings) ? r!.ratings : []) as Rec[]) {
    const marks = ((Array.isArray(g.dailyRatings) ? g.dailyRatings : []) as Rec[])
      .map((d) => ({ date: isoFromDmy(d.class_date as string) ?? "", value: num(d.rating) ?? 0 }))
      .filter((m) => m.date && m.value > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!marks.length) continue;
    parts.push({ name: String(g.name ?? "Отметки"), avg: Math.round(avg(marks.map((m) => m.value)) * 100) / 100, marks });
  }
  return { parts, semesterRating: num(r?.semester_rating) };
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  return out;
}

/** Вход в EMIS: токен сессии или ответ ученику. */
async function emisLogin(login: string, password: string): Promise<{ token: string } | EmisResult> {
  const auth = await call("login/", { method: "POST", body: JSON.stringify({ login: login.trim(), password }) });
  if (auth.status === 401 || auth.status === 400) return { status: "invalid", message: "Неверный логин или пароль EMIS." };
  if (auth.status === 429) return { status: "error", message: "EMIS просит подождать: слишком много попыток входа. Попробуй через несколько минут." };
  const token = ((auth.body?.result as Rec | undefined)?.access_token as string) ?? null;
  if (!token) return { status: "error", message: "EMIS не принял вход. Попробуй позже или загрузи скриншот оценок." };
  return { token };
}

export const emisLogout = (token: string) => call("logout/", { method: "POST", token }).then(() => undefined, () => undefined);

/** Всё для дневника по токену: оценки, разбивка, расписание, пропуски, данные для анкеты. Токен истёк → expired. */
export async function emisCollect(tk: string, lang: Lang, now = new Date()): Promise<EmisResult | { status: "expired" }> {
  try {
    const [profile, ratings, curriculum, hours, subjects] = await Promise.all([
      call("profile/", { token: tk }), call("ratings/", { token: tk }), call("curriculum/", { token: tk }), call("class-hours/", { token: tk }), call("edu-subjects/", { token: tk }),
    ]);
    if (ratings.status === 401 || profile.status === 401) return { status: "expired" };
    if (ratings.status !== 200) return { status: "error", message: "Вход в EMIS удался, но оценки не открылись. Попробуй позже." };
    const { items, semesters } = gradesFromEmis(ratings.body?.results, lang);
    const p = (profile.body?.result ?? {}) as Rec & { course?: number; edu_group?: { current_semester?: number; name?: string } };
    const course = typeof p.course === "number" && p.course >= 1 && p.course <= 2 ? p.course : null;
    const semester = typeof p.edu_group?.current_semester === "number" ? p.edu_group.current_semester : null;
    const citizen = (p.citizen ?? {}) as Rec;
    const school = nameOf((p.institution as Rec | undefined)?.name as Named, lang) || null;
    const person: DiaryPerson = {
      firstName: typeof citizen.first_name === "string" ? citizen.first_name.trim() || null : null,
      lastName: typeof citizen.last_name === "string" ? citizen.last_name.trim() || null : null,
      region: nameOf((p.region as Rec | undefined)?.name as Named, lang) || null,
      school,
      className: p.edu_group?.name ?? null,
      grade: course ? 9 + course : null,
    };

    // Разбивка по видам контроля — за текущий семестр, по предметам с оценками.
    const semDates = (((curriculum.body?.result as Rec | undefined)?.semester_dates ?? []) as { start_date?: string; end_date?: string }[]);
    const semIdx = semester ? semester - 1 : 0;
    const subjectIds = new Map<string, number>();
    for (const x of ((subjects.body?.results ?? []) as Rec[])) {
      const nm = cleanName(nameOf((x.edu_subject as Rec | undefined)?.name as Named, lang));
      if (nm && typeof x.edu_subject_id === "number") subjectIds.set(nm.toLowerCase(), x.edu_subject_id);
    }
    const graded = items.filter((i) => subjectIds.has(i.subject.toLowerCase()));
    const details = await pool(graded, 4, async (i) => {
      const r = await call(`edu-subjects/${subjectIds.get(i.subject.toLowerCase())}/ratings/?semester=${semIdx + 1}`, { token: tk }).catch(() => null);
      return { i, ...(r?.status === 200 ? partsFromSubjectRatings(r.body) : { parts: [], semesterRating: null }) };
    });
    // Один семестр с оценками и есть отметки по датам — оценка точнее по ним, чем по округлённому текущему контролю.
    for (const d of details) {
      if ((d.i.count ?? 1) !== 1 || !d.parts.length) continue;
      const hasFinal = d.parts.some((x) => /yakuniy|итог/i.test(x.name));
      if (hasFinal && d.semesterRating != null) continue;
      d.i.grade = Math.round(avg(d.parts.map((x) => x.avg as number)) * 100) / 100;
    }
    const diarySubjects: DiarySubject[] = items.map((i) => {
      const d = details.find((x) => x.i === i);
      return { subject: i.subject, key: i.key, ...(i.special ? { special: true } : {}), grade: i.grade, parts: d?.parts ?? [], semesterRating: d?.semesterRating ?? null };
    });

    // Расписание: прошлая неделя и 4 вперёд (EMIS отдаёт до 7 дней за запрос).
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    const weeks = Array.from({ length: 5 }, (_, k) => {
      const a = new Date(monday); a.setDate(monday.getDate() + k * 7);
      const b = new Date(a); b.setDate(a.getDate() + 6);
      return [ddmmyyyy(a), ddmmyyyy(b)];
    });
    const sched = await pool(weeks, 3, ([a, b]) => call(`class-schedules/?begin_date=${a}&end_date=${b}`, { token: tk }).catch(() => null));
    const days = sched.flatMap((r) => (r?.status === 200 ? daysFromSchedules(r.body?.results, hours.body?.results, lang) : []));

    // Пропуски за текущий семестр.
    const sd = semDates[semIdx];
    const att = sd?.start_date && sd?.end_date ? await call(`attendance/?begin_date=${sd.start_date}&end_date=${sd.end_date}`, { token: tk }).catch(() => null) : null;
    const absItems = ((att?.status === 200 ? att.body?.results : []) as Rec[] ?? [])
      .filter((a) => a.is_absent === true)
      .map((a) => ({ date: isoFromDmy(a.class_date as string) ?? "", subject: cleanName(nameOf((a.edu_subject as Rec | undefined)?.name as Named, lang)) }))
      .filter((a) => a.date && a.subject)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const d of days) for (const l of d.lessons) if (absItems.some((a) => a.date === d.date && a.subject.toLowerCase() === l.subject.toLowerCase())) l.absent = true;

    if (!items.length && !days.length) return { status: "error", message: "В EMIS пока нет оценок за этот учебный год. Загляни после первых оценок или введи их вручную." };
    const period = `${course ? `${course} курс лицея` : "лицей"}${semester ? `, семестр ${semester}` : ""}${semesters > 1 ? ` (семестров с оценками: ${semesters})` : ""}`;
    const diary: Diary = {
      source: "emis", fetchedAt: now.toISOString(), period, school, className: person.className,
      subjects: diarySubjects, days, absences: att?.status === 200 ? { total: absItems.length, items: absItems.slice(0, 60) } : null,
    };
    return { status: "ok", items, scale: 5, grade: person.grade, className: person.className, marks: items.reduce((a, b) => a + (b.count ?? 1), 0), period, diary, person };
  } catch (e) {
    console.error("[emis]", (e as Error).name, (e as Error).message.slice(0, 100));
    return { status: "error", message: "EMIS сейчас не отвечает. Попробуй позже или загрузи скриншот оценок." };
  }
}

/**
 * Импорт по логину и паролю. keep — ученик согласился на автообновление: сессию не закрываем и отдаём токен
 * вызывающему (он сохранит его зашифрованным). Иначе сессия закрывается сразу.
 */
export async function importEmis(login: string, password: string, lang: Lang, opts: { keep?: boolean; now?: Date } = {}): Promise<EmisResult & { token?: string }> {
  let token: string | null = null;
  try {
    const l = await emisLogin(login, password);
    if (!("token" in l)) return l;
    token = l.token;
    const r = await emisCollect(token, lang, opts.now);
    if (r.status === "expired") return { status: "error", message: "EMIS сразу завершил сессию. Попробуй ещё раз." };
    if (r.status === "ok" && opts.keep) {
      const keepToken = token;
      token = null; // не выходим — сессия нужна для автообновления
      return { ...r, token: keepToken };
    }
    return r;
  } catch (e) {
    console.error("[emis]", (e as Error).name, (e as Error).message.slice(0, 100));
    return { status: "error", message: "EMIS сейчас не отвечает. Попробуй позже или загрузи скриншот оценок." };
  } finally {
    if (token) await emisLogout(token);
  }
}
