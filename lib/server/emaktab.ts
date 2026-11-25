import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { aggregateMarks, gradeFromGroup, type GradeItem, type GradeScale } from "@/lib/grades";

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
  | { status: "ok"; items: GradeItem[]; scale: GradeScale; marks: number; period: string; grade: number | null; className: string | null }
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
export function personFromContext(raw: unknown): { personId: string; schoolId: string; groupName: string | null } | null {
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

export async function importEmaktab(login: string, password: string, captcha?: { answer: string; state: string }): Promise<EmaktabResult> {
  try {
    const s = await signIn(login, password, captcha);
    if (!("jar" in s)) return s;
    const jar = s.jar;
    const person = personFromContext(await api(jar, "/api/v2/users/me/context"));
    if (!person?.personId || !person.schoolId) return { status: "error", message: "Вход удался, но eMaktab не отдал данные ученика. Если это аккаунт родителя — войди аккаунтом ученика." };

    const { year: y, start } = schoolYear();
    const now = Date.now();
    const windows: [number, number][] = [];
    for (let t = start.getTime(); t < now; t += 14 * 86400_000) windows.push([Math.floor(t / 1000), Math.floor(Math.min(now, t + 14 * 86400_000 - 1000) / 1000)]);
    const marks: { subject: string; value: string | number }[] = [];
    // По 4 запроса параллельно: укладываемся в лимит функции и не нагружаем eMaktab.
    for (let i = 0; i < windows.length; i += 4) {
      const part = await Promise.all(windows.slice(i, i + 4).map(([a, b]) => api(jar, "/api/v2/marks/diary", { personId: person.personId, schoolId: person.schoolId, startDate: a, finishDate: b, timestamp: now })));
      for (const p of part) marks.push(...marksFromDiary(p));
    }
    const { items, scale } = aggregateMarks(marks);
    if (!items.length) return { status: "error", message: "В дневнике eMaktab за этот учебный год пока нет отметок. Можно ввести оценки вручную или загрузить фото табеля." };
    return { status: "ok", items, scale, marks: marks.length, period: `${y}/${String(y + 1).slice(2)} учебный год`, grade: gradeFromGroup(person.groupName), className: person.groupName };
  } catch (e) {
    console.error("[emaktab]", (e as Error).message.slice(0, 120));
    return { status: "error", message: "eMaktab сейчас не отвечает. Попробуй позже или загрузи фото табеля." };
  }
}
