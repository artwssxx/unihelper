import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { Diary, DiaryDay, DiaryLesson, DiaryPerson, DiarySubject } from "@/lib/diary";
import { aggregateMarks, gradeFromGroup, subjectKey, type GradeItem, type GradeScale } from "@/lib/grades";

// Импорт оценок из eMaktab (электронный дневник школ Узбекистана) по логину и паролю ученика.
// Официального API для сторонних сервисов нет, поэтому повторяем вход как браузер:
//   1) GET login.emaktab.uz → форма входа (скрытые поля, cookie);
//   2) POST формы → cookie сессии (UZDnevnikAuth_*); капча → показываем ученику; подтверждение входа → просим подтвердить на сайте;
//   3) GET emaktab.uz/api/v2/users/me/context → personId, schoolId, класс;
//   4) GET emaktab.uz/api/v2/marks/diary по двухнедельным окнам с 1 сентября → отметки по предметам → средние.
// Пароль используется один раз и НИГДЕ не сохраняется и не пишется в логи. Имя ученика не возвращаем.

const LOGIN = "https://login.emaktab.uz/";
const LOGIN_URL = "https://login.emaktab.uz/login";
const WEB = "https://emaktab.uz";
const UA = "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

type Jar = Record<string, string>;
type Page = { status: number; body: string; url: string };

export type EmaktabResult =
  | { status: "ok"; items: GradeItem[]; scale: GradeScale; marks: number; period: string; grade: number | null; className: string | null; diary: Diary; person: DiaryPerson }
  | { status: "captcha"; image: string | null; state: string; message: string; diag?: string }
  | { status: "invalid"; message: string }
  | { status: "confirm"; message: string }
  | { status: "error"; message: string; diag?: string };

const cookieHeader = (jar: Jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

function keep(jar: Jar, res: Response) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}

/** Запрос с ручным переходом по редиректам: fetch при автопереходе теряет Set-Cookie. */
async function go(url: string, jar: Jar, init: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<Page> {
  let cur = url, method = init.method ?? "GET", body = init.body;
  for (let hop = 0; hop < 10; hop++) {
    const res = await fetch(cur, {
      method, body, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-language": "uz,ru;q=0.8,en;q=0.6", ...init.headers, cookie: cookieHeader(jar) },
    });
    keep(jar, res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur).toString();
      method = "GET";
      body = undefined;
      continue;
    }
    return { status: res.status, body: await res.text(), url: cur };
  }
  throw new Error("too_many_redirects");
}


const PASSWORD_INPUT = /<input\b[^>]*(type\s*=\s*["']?password|name\s*=\s*["']?password["'\s>])/i;

/** Состояние ошибки входа из модели страницы (JSON.parse('…')) или разметки. */
export function loginErrors(html: string): { wrong: boolean; captcha: boolean; wrongCaptcha: boolean; text: string | null } {
  let wrong = false, captcha = false, wrongCaptcha = false, text: string | null = null;
  for (const m of html.matchAll(/JSON\.parse\('([^']*)'\)/g)) {
    try {
      const d = JSON.parse(decodeJs(m[1]).replace(/\\'/g, "'"));
      if (!d || typeof d !== "object" || !("hasErrors" in d || "exceededAttempts" in d || "isWrongCaptcha" in d)) continue;
      wrongCaptcha ||= Boolean(d.isWrongCaptcha);
      captcha ||= Boolean(d.exceededAttempts || d.isWrongCaptcha);
      wrong ||= Boolean(d.hasErrors) && !d.isWrongCaptcha && !d.exceededAttempts;
      text ||= typeof d.firstErrorText === "string" ? d.firstErrorText : null;
    } catch { /* другой JSON */ }
  }
  if (/isWrongCaptcha["']?\s*[:=]\s*true/i.test(html)) wrongCaptcha = captcha = true;
  if (/exceededAttempts["']?\s*[:=]\s*true/i.test(html)) captcha = true;
  if (!wrong && !captcha && /"hasErrors"\s*:\s*true/.test(html)) wrong = true;
  if (!wrong && !captcha && /class\s*=\s*["'][^"']*(validation-summary-errors|field-validation-error|login__body__error)[^"']*["']/i.test(html)) wrong = true;
  return { wrong, captcha, wrongCaptcha, text };
}

// ── Состояние для второго шага (капча): cookie и поля формы, зашифрованы ключом сервера на 10 минут ──

const key = () => createHash("sha256").update(`emaktab:${process.env.MOCK_SECRET || process.env.ADMIN_SECRET || "unihelper-dev-secret"}`).digest();

function seal(v: object): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify({ ...v, exp: Date.now() + 10 * 60_000 })), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}

function unseal<T>(s: string): T | null {
  try {
    const b = Buffer.from(s, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    const v = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString()) as T & { exp: number };
    return v.exp > Date.now() ? v : null;
  } catch {
    return null;
  }
}

async function fetchImage(url: string, jar: Jar): Promise<{ image: string | null; note: string }> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, cookie: cookieHeader(jar), referer: LOGIN_URL, accept: "image/*,*/*" }, signal: AbortSignal.timeout(10_000) });
    keep(jar, r);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/image/i.test(type)) return { image: null, note: `img HTTP ${r.status} ${type.slice(0, 20)}` };
    return { image: `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`, note: "img ok" };
  } catch (e) {
    return { image: null, note: `img ${(e as Error).name}` };
  }
}

/** Адрес картинки капчи: «imagePart» из модели страницы, иначе стандартный. Id капчи придумывает клиент (uuid). */
export function captchaPart(html: string): string {
  const m = decodeJs(html).match(/"imagePart"\s*:\s*"([^"]+)"/);
  const part = m?.[1]?.replace(/\\\//g, "/") ?? `${LOGIN}captcha/true/`;
  return /^https:\/\/[a-z0-9.-]*emaktab\.uz\//i.test(part) ? part : `${LOGIN}captcha/true/`;
}

/** Скрытое поле exceededAttempts = True — без капчи вход не примут. */
export function exceededInput(html: string): boolean {
  const m = html.match(/name="exceededAttempts"[^>]*value="(\w+)"/i) ?? html.match(/value="(\w+)"[^>]*name="exceededAttempts"/i);
  return Boolean(m) && m![1].toLowerCase() === "true";
}

const decodeJs = (s: string) => s.replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

async function newCaptcha(part: string, jar: Jar, message: string): Promise<EmaktabResult> {
  const id = randomUUID();
  const r = await fetchImage(part + id, jar);
  if (!r.image) console.error("[emaktab] капча без картинки:", r.note);
  return { status: "captcha", image: r.image, message, state: seal({ jar, id }), ...(r.image ? {} : { diag: r.note }) };
}

const authed = (jar: Jar) => Object.keys(jar).some((k) => /^UZDnevnikAuth_/i.test(k));
const onLogin = (url: string) => new URL(url).hostname === "login.emaktab.uz";
const MAINTENANCE = "В eMaktab сейчас идут технические работы — сайт временно не пускает. Попробуй позже или загрузи скриншот оценок.";

/**
 * Вход как в браузере: GET формы → POST login/password (+ капча, если её требуют) → удачный вход уводит с login.emaktab.uz
 * на emaktab.uz с cookie сессии. Ошибки — из модели страницы (hasErrors, isWrongCaptcha, exceededAttempts).
 */
async function signIn(login: string, password: string, captcha?: { answer: string; state: string }): Promise<{ jar: Jar } | EmaktabResult> {
  let jar: Jar = {};
  let captchaId: string | null = null;
  if (captcha) {
    const st = unseal<{ jar: Jar; id: string }>(captcha.state);
    if (!st) return { status: "error", message: "Код с картинки устарел. Нажми «Войти» ещё раз." };
    jar = st.jar;
    captchaId = st.id;
  }
  const page = await go(LOGIN_URL, jar, { headers: { referer: LOGIN } });
  if (!onLogin(page.url) && authed(jar)) return { jar };
  if (page.status === 503 || /технические работы|texnik ishlar/i.test(page.body)) return { status: "error", message: MAINTENANCE };
  if (!PASSWORD_INPUT.test(page.body)) {
    const title = page.body.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim() ?? "";
    console.error("[emaktab] нет формы входа", page.status, new URL(page.url).pathname, title);
    return { status: "error", message: "eMaktab не показал форму входа. Возможно, сайт обновился — попробуй загрузить скриншот оценок.", diag: `HTTP ${page.status} · ${new URL(page.url).pathname} · «${title}»` };
  }
  const part = captchaPart(page.body);
  // Уже нужна капча — не тратим попытку впустую.
  if (exceededInput(page.body) && !captcha) return newCaptcha(part, jar, "eMaktab просит ввести код с картинки.");

  const fields: Record<string, string> = { exceededAttempts: captcha ? "True" : "False", ReturnUrl: "", FingerprintId: "", login, password };
  if (captcha) {
    fields["Captcha.Id"] = captchaId ?? "";
    fields["Captcha.Input"] = captcha.answer.trim();
  }
  const res = await go(LOGIN_URL, jar, {
    method: "POST",
    body: new URLSearchParams(fields).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://login.emaktab.uz", referer: LOGIN_URL },
  });
  if (!onLogin(res.url) || (authed(jar) && !PASSWORD_INPUT.test(res.body))) return { jar };
  if (/__2FA__/.test(res.body) && !PASSWORD_INPUT.test(res.body))
    return { status: "confirm", message: "eMaktab просит подтвердить вход (телефон, Telegram или контрольный вопрос). Войди один раз на login.emaktab.uz, подтверди и повтори импорт." };
  const err = loginErrors(res.body);
  const part2 = captchaPart(res.body);
  if (err.wrongCaptcha) return newCaptcha(part2, jar, "Код с картинки не подошёл, попробуй ещё раз.");
  if (err.captcha || exceededInput(res.body)) return newCaptcha(part2, jar, "eMaktab просит ввести код с картинки.");
  return { status: "invalid", message: "Неверный логин или пароль eMaktab." };
}

async function api(jar: Jar, path: string, params?: Record<string, string | number>): Promise<unknown | null> {
  const u = new URL(WEB + path);
  for (const [k, v] of Object.entries(params ?? {})) u.searchParams.set(k, String(v));
  const r = await fetch(u, {
    redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(12_000),
    headers: { "user-agent": UA, accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest", referer: `${WEB}/userfeed`, cookie: cookieHeader(jar) },
  });
  keep(jar, r);
  if (r.status !== 200) return null;
  return parseBigJson(await r.text());
}

/** JSON с 19-значными ID: числа длиннее 15 цифр превращаем в строки до разбора, иначе теряется точность. */
export function parseBigJson(text: string): unknown | null {
  try {
    return JSON.parse(text.replace(/([:[,]\s*)(-?\d{16,})(?=\s*[,\]}])/g, '$1"$2"'));
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" || typeof v === "number" || typeof v === "bigint" ? String(v) : "");

/** Ученик из контекста: personId, schoolId, класс. Большие ID держим строками. */
export function personFromContext(raw: unknown): { personId: string; schoolId: string; groupName: string | null; schoolName?: string | null } | null {
  if (!raw) return null;
  // JSON.parse теряет точность у 19-значных чисел — поэтому разбираем и текстовое представление, если оно есть.
  const found: Record<string, unknown>[] = [];
  const walk = (v: unknown, d = 0) => {
    if (d > 6 || !v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, d + 1));
    const o = v as Record<string, unknown>;
    if ("personId" in o || "person_id" in o) found.push(o);
    Object.values(o).forEach((x) => walk(x, d + 1));
  };
  walk(raw);
  const p = found.find((o) => str(o.schoolId ?? o.school_id ?? (o.school as Record<string, unknown> | undefined)?.id)) ?? found[0];
  if (!p) return null;
  const groups = (p.eduGroups ?? p.groups) as Record<string, unknown>[] | undefined;
  const groupName = str(p.groupName ?? p.eduGroupName ?? groups?.[0]?.name ?? groups?.[0]?.fullName) || null;
  return {
    personId: str(p.personId ?? p.person_id),
    schoolId: str(p.schoolId ?? p.school_id ?? (p.school as Record<string, unknown> | undefined)?.id ?? (p.schools as Record<string, unknown>[] | undefined)?.[0]?.id),
    groupName,
    schoolName: str(p.schoolName ?? (p.school as Record<string, unknown> | undefined)?.name ?? (p.schools as Record<string, unknown>[] | undefined)?.[0]?.name) || null,
  };
}

/** Отметки из ответа дневника: у урока — предмет, в workMarks/marks — значения. Структура разбирается гибко. */
export function marksFromDiary(raw: unknown): { subject: string; value: string | number }[] {
  const out: { subject: string; value: string | number }[] = [];
  const subjectOf = (o: Record<string, unknown>): string | null => {
    const s = o.subject ?? o.subjectName;
    if (typeof s === "string") return s;
    if (s && typeof s === "object") return str((s as Record<string, unknown>).name) || null;
    return null;
  };
  const walk = (v: unknown, subject: string | null, inMarks: boolean, d = 0) => {
    if (d > 10 || v == null) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, subject, inMarks, d + 1));
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    const s = subjectOf(o) ?? subject;
    if (inMarks && s && (typeof o.value === "string" || typeof o.value === "number")) {
      out.push({ subject: s, value: o.value });
      return;
    }
    for (const [k, x] of Object.entries(o)) walk(x, s, inMarks || /marks$/i.test(k), d + 1);
  };
  walk(raw, null, false);
  return out;
}

/** Текущий учебный год: год начала и 1 сентября (полночь по Ташкенту). До 15 сентября — прошлый год. */
export function schoolYear(now = new Date()): { year: number; start: Date } {
  const y = now.getUTCMonth() > 8 || (now.getUTCMonth() === 8 && now.getUTCDate() >= 15) ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return { year: y, start: new Date(Date.UTC(y, 8, 1) - 5 * 3600_000) };
}

type R = Record<string, unknown>;
const ABSENT = /^(н|нб|nb|n|б|п|absent)$/i;

/** Дата дня дневника: секунды/миллисекунды или строка → YYYY-MM-DD по Ташкенту (UTC+5). */
export function dayIso(v: unknown): string | null {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms + 5 * 3600_000).toISOString().slice(0, 10);
}
const hhmm = (h: unknown, m: unknown) => {
  const hs = String(h ?? "").trim();
  if (/^\d{1,2}:\d{2}/.test(hs)) return hs.slice(0, 5).padStart(5, "0");
  if (!/^\d{1,2}$/.test(hs)) return null;
  return `${hs.padStart(2, "0")}:${String(m ?? "0").padStart(2, "0")}`;
};
const subjectName = (l: R) => (typeof l.subject === "string" ? l.subject : str((l.subject as R | undefined)?.name)) || str(l.subjectName);

/** Дни из ответов /api/v2/marks/diary: уроки (время, кабинет, тема, домашка, отметки, пропуск). Учителей не берём. */
type Mark = { subject: string; date: string; value: number; work?: string };
export function daysFromEmaktab(responses: unknown[]): { days: DiaryDay[]; marks: Mark[]; absences: { date: string; subject: string }[] } {
  const days = new Map<string, DiaryLesson[]>();
  const marks: Mark[] = [];
  const absences: { date: string; subject: string }[] = [];
  for (const raw of responses) {
    for (const d of (((raw as R | null)?.days ?? []) as R[])) {
      const date = dayIso(d.date);
      if (!date) continue;
      const lessons: DiaryLesson[] = [];
      for (const l of ((d.lessons ?? []) as R[])) {
        const subject = subjectName(l).trim();
        if (!subject || l.isCanceled === true) continue;
        const values: number[] = [];
        // Отметка посещения: «п» — пропуск, «н»/«б» — не был/болел, «о» — опоздание (не пропуск).
        const log = String(((l.logEntry ?? {}) as R).lessonLogEntryValue ?? "").trim();
        let absent = l.isAbsent === true || /absent|отсутств/i.test(String(l.attendance ?? "")) || /^(п|н|б|нб|ув)$/i.test(log);
        const works: { value: number; work: string }[] = [];
        for (const wm of ((l.workMarks ?? []) as R[])) for (const m of ((wm.marks ?? []) as R[])) {
          const v = String(m.value ?? "").trim();
          if (ABSENT.test(v)) absent = true;
          const n = Number(v.replace(",", "."));
          if (Number.isFinite(n) && n > 0 && n <= 10) { values.push(n); works.push({ value: n, work: str(wm.workName) || "Отметки" }); }
        }
        const hours = (l.hours ?? {}) as R;
        const hw = l.homework as R | null | undefined;
        lessons.push({
          n: Number(l.number ?? l.lessonNumber) || null,
          start: hhmm(hours.startHour, hours.startMinute) ?? (typeof l.startTime === "string" ? hhmm(l.startTime, null) : null),
          end: hhmm(hours.endHour, hours.endMinute) ?? (typeof l.endTime === "string" ? hhmm(l.endTime, null) : null),
          subject,
          room: str(l.place ?? l.room) || null,
          kind: Array.isArray(l.importantWorks) && l.importantWorks.length ? "Контрольная" : null,
          topic: str(l.theme) || null,
          homework: typeof hw?.text === "string" ? hw.text.trim().slice(0, 600) || null : null,
          homeworkUrl: null,
          marks: values,
          absent,
        });
        for (const w of works) marks.push({ subject, date, value: w.value, work: w.work });
        if (absent) absences.push({ date, subject });
      }
      lessons.sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
      days.set(date, lessons);
    }
  }
  return { days: [...days].map(([date, lessons]) => ({ date, lessons })).sort((a, b) => a.date.localeCompare(b.date)), marks, absences };
}

/** Четверть по дате (ориентировочно для школ Узбекистана): I — сен–окт, II — ноя–дек, III — янв–мар, IV — апр–июн. */
const quarterOf = (date: string) => { const m = Number(date.slice(5, 7)); return m >= 9 && m <= 10 ? 1 : m >= 11 ? 2 : m <= 3 ? 3 : 4; };

/** Предметы дневника: средняя и отметки по видам работ («Ответ на уроке», «Самостоятельная работа»…), иначе по четвертям. */
export function subjectsFromMarks(marks: Mark[], items: GradeItem[]): DiarySubject[] {
  const part = (name: string, ms: Mark[]) => ({ name, avg: Math.round((ms.reduce((a, b) => a + b.value, 0) / ms.length) * 100) / 100, marks: ms.map((m) => ({ date: m.date, value: m.value })) });
  return items.map((i) => {
    const mine = marks.filter((m) => m.subject === i.subject).sort((a, b) => a.date.localeCompare(b.date));
    const works = [...new Set(mine.map((m) => m.work).filter(Boolean))] as string[];
    const parts = works.length > 1
      ? works.map((w) => part(w, mine.filter((m) => m.work === w)))
      : [1, 2, 3, 4].map((q) => ({ q, ms: mine.filter((m) => quarterOf(m.date) === q) })).filter((x) => x.ms.length).map((x) => part(`${x.q} четверть`, x.ms));
    return { subject: i.subject, key: i.key ?? subjectKey(i.subject), grade: i.grade, parts };
  });
}

/** Контекст ученика из страницы /marks (JSON «context» в разметке): personId, школа, класс, имя. */
export function contextFromPage(html: string): { personId: string; schoolId: string; groupId: string | null; groupName: string | null; schoolName: string | null; firstName: string | null; lastName: string | null; role: string | null } | null {
  const at = html.indexOf('"context":{');
  if (at < 0) return null;
  const i = at + "\"context\":".length;
  let depth = 0, inStr = false, end = -1;
  for (let j = i; j < html.length && j < i + 400_000; j++) {
    const c = html[j];
    if (inStr) { if (c === "\\") j++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { end = j; break; }
  }
  if (end < 0) return null;
  const ctx = parseBigJson(html.slice(i, end + 1)) as R | null;
  const mems = ((ctx?.schoolMemberships ?? []) as R[]).filter((m) => str(m.personId) && str(m.schoolId));
  // Основная школа (не кружки/доп. образование).
  const m = mems.find((x) => x.isOo === true && x.isOdo !== true) ?? mems[0];
  if (!m) return null;
  const g = ((m.groups ?? []) as R[])[0];
  return {
    personId: str(m.personId), schoolId: str(m.schoolId), groupId: str(g?.groupId) || null, groupName: str(g?.groupName) || null,
    schoolName: str(m.schoolName) || null, firstName: str(m.firstName) || null, lastName: str(m.lastName) || null, role: str(ctx?.role) || null,
  };
}

async function page(jar: Jar, path: string): Promise<string | null> {
  const r = await fetch(WEB + path, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "user-agent": UA, accept: "text/html", cookie: cookieHeader(jar) } }).catch(() => null);
  if (!r || r.status !== 200) return null;
  keep(jar, r);
  return r.text();
}

export async function importEmaktab(login: string, password: string, captcha?: { answer: string; state: string }): Promise<EmaktabResult> {
  try {
    const s = await signIn(login, password, captcha);
    if (!("jar" in s)) return s;
    const jar = s.jar;
    // Ученик: сначала из страницы оценок (там контекст с personId, школой и классом), иначе — старый API контекста.
    const fromPage = contextFromPage((await page(jar, "/marks")) ?? "");
    const fromApi = fromPage ? null : personFromContext(await api(jar, "/api/v2/users/me/context"));
    const person = fromPage ?? (fromApi ? { ...fromApi, groupId: null, firstName: null, lastName: null, role: null } : null);
    if (!person?.personId || !person.schoolId)
      return { status: "error", message: "Вход удался, но eMaktab не отдал данные ученика. Если это аккаунт родителя — войди аккаунтом ученика." };
    if (person.role && /parent|родител/i.test(person.role) && !fromPage?.personId)
      return { status: "error", message: "Это аккаунт родителя — войди аккаунтом ученика." };

    const { year: y, start } = schoolYear();
    const now = Date.now();
    // Отметки — с 1 сентября; расписание и домашка — ещё на 3 недели вперёд.
    const windows: [number, number][] = [];
    const until = now + 21 * 86400_000;
    for (let t = start.getTime(); t < until; t += 14 * 86400_000) windows.push([Math.floor(t / 1000), Math.floor(Math.min(until, t + 14 * 86400_000 - 1000) / 1000)]);
    const responses: unknown[] = [];
    // По 4 запроса параллельно: укладываемся в лимит функции и не нагружаем eMaktab.
    for (let i = 0; i < windows.length; i += 4) {
      responses.push(...(await Promise.all(windows.slice(i, i + 4).map(([a, b]) => api(jar, "/api/v2/marks/diary", { personId: person.personId, schoolId: person.schoolId, ...(person.groupId ? { groupId: person.groupId } : {}), startDate: a, finishDate: b, timestamp: now })))));
    }
    const parsed = daysFromEmaktab(responses);
    const { items, scale } = aggregateMarks(parsed.marks.length ? parsed.marks : responses.flatMap(marksFromDiary));
    if (!items.length && !parsed.days.length) return { status: "error", message: "В дневнике eMaktab за этот учебный год пока нет отметок. Можно ввести оценки вручную или загрузить фото табеля." };
    const today = new Date(now + 5 * 3600_000).toISOString().slice(0, 10);
    const from = new Date(now - 14 * 86400_000 + 5 * 3600_000).toISOString().slice(0, 10);
    const grade = gradeFromGroup(person.groupName);
    const period = `${y}/${String(y + 1).slice(2)} учебный год`;
    const diary: Diary = {
      source: "emaktab", fetchedAt: new Date(now).toISOString(), period, school: person.schoolName ?? null, className: person.groupName,
      subjects: subjectsFromMarks(parsed.marks, items),
      // В снимке — две недели назад и три вперёд (с сегодняшним днём): этого хватает для расписания и домашки.
      days: parsed.days.filter((d) => d.date >= from || d.date === today),
      absences: { total: parsed.absences.length, items: parsed.absences.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60) },
    };
    return {
      status: "ok", items, scale, marks: parsed.marks.length, period, grade, className: person.groupName, diary,
      person: { firstName: person.firstName, lastName: person.lastName, region: null, school: person.schoolName ?? null, className: person.groupName, grade },
    };
  } catch (e) {
    console.error("[emaktab]", (e as Error).message.slice(0, 120));
    return { status: "error", message: "eMaktab сейчас не отвечает. Попробуй позже или загрузи фото табеля." };
  }
}
