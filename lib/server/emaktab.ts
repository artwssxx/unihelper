import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { aggregateMarks, gradeFromGroup, type GradeItem, type GradeScale } from "@/lib/grades";

// Импорт оценок из eMaktab (электронный дневник школ Узбекистана) по логину и паролю ученика.
// Официального API для сторонних сервисов нет, поэтому повторяем вход как браузер:
//   1) GET login.emaktab.uz → форма входа (скрытые поля, cookie);
//   2) POST формы → cookie сессии (UZDnevnikAuth_*); капча → показываем ученику; подтверждение входа → просим подтвердить на сайте;
//   3) GET emaktab.uz/api/v2/users/me/context → personId, schoolId, класс;
//   4) GET emaktab.uz/api/v2/marks/diary по двухнедельным окнам с 1 сентября → отметки по предметам → средние.
// Пароль используется один раз и НИГДЕ не сохраняется и не пишется в логи. Имя ученика не возвращаем.

const LOGIN = "https://login.emaktab.uz/";
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

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

interface LoginForm { action: string; hidden: Record<string, string>; captchaUrl: string | null; captcha: boolean }

/** Форма с полем пароля: адрес отправки, скрытые поля, капча. */
const PASSWORD_INPUT = /<input\b[^>]*(type\s*=\s*["']?password|name\s*=\s*["']?password["'\s>])/i;

/** Фрагменты разметки вокруг «captcha» — для диагностики, если картинку найти не удалось (публичная страница входа). */
function captchaSnippets(html: string): string {
  const out: string[] = [];
  const re = /captcha|smartcaptcha|recaptcha|turnstile|hcaptcha/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 4) {
    out.push(html.slice(Math.max(0, m.index - 60), m.index + 90).replace(/\s+/g, " "));
    re.lastIndex = m.index + 200;
  }
  return out.join(" ‖ ").slice(0, 700);
}
let lastCaptchaHtml = "";

export function parseLoginForm(html: string, base: string): LoginForm | null {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  // Поле пароля может стоять вне <form>…</form> (разметка собирается частями) — тогда берём всю страницу
  // и первую форму как адрес отправки (так же делают открытые клиенты eMaktab).
  const form = forms.find((f) => PASSWORD_INPUT.test(f)) ?? (PASSWORD_INPUT.test(html) ? html : null);
  if (!form) return null;
  const open = form.match(/<form\b[^>]*>/i)?.[0] ?? html.match(/<form\b[^>]*>/i)?.[0] ?? "<form>";
  const hidden: Record<string, string> = {};
  for (const t of form.match(/<input\b[^>]*>/gi) ?? []) {
    if ((attr(t, "type") ?? "").toLowerCase() !== "hidden") continue;
    const name = attr(t, "name");
    if (name) hidden[name] = decode(attr(t, "value") ?? "");
  }
  const img = html.match(/(?:https?:\/\/[^"'\s>]+)?\/captcha\/[^"'\s>]+/i)?.[0] ?? null;
  // Блок капчи на странице есть всегда, но скрыт классом …_hidden, пока eMaktab её не требует.
  lastCaptchaHtml = html;
  const captcha = (html.match(/<div\b[^>]*class\s*=\s*["'][^"']*login__body__captcha[^"']*["']/gi) ?? []).some((t) => !/login__body__captcha_hidden/.test(t));
  return { action: new URL(decode(attr(open, "action") || base), base).toString(), hidden, captchaUrl: img ? new URL(decode(img), base).toString() : null, captcha };
}

/** Состояние ошибки входа из модели страницы (JSON.parse('…')) или разметки. */
export function loginErrors(html: string): { wrong: boolean; captcha: boolean; text: string | null } {
  let wrong = false, captcha = false, text: string | null = null;
  for (const m of html.matchAll(/JSON\.parse\('([^']*)'\)/g)) {
    try {
      const d = JSON.parse(m[1].replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\'/g, "'"));
      if (!d || typeof d !== "object" || !("hasErrors" in d || "exceededAttempts" in d || "isWrongCaptcha" in d)) continue;
      wrong ||= Boolean(d.hasErrors) && !d.isWrongCaptcha;
      captcha ||= Boolean(d.exceededAttempts || d.isWrongCaptcha);
      text ||= typeof d.firstErrorText === "string" ? d.firstErrorText : null;
    } catch { /* другой JSON */ }
  }
  if (/exceededAttempts["']?\s*[:=]\s*true|isWrongCaptcha["']?\s*[:=]\s*true/i.test(html)) captcha = true;
  if (!wrong && !captcha && /"hasErrors"\s*:\s*true/.test(html)) wrong = true;
  if (!wrong && !captcha && /class\s*=\s*["'][^"']*(validation-summary-errors|field-validation-error|login__body__error)[^"']*["']/i.test(html)) wrong = true;
  return { wrong, captcha, text };
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
    const r = await fetch(url, { headers: { "user-agent": UA, cookie: cookieHeader(jar), referer: LOGIN, accept: "image/*,*/*" }, signal: AbortSignal.timeout(10_000) });
    keep(jar, r);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/image/i.test(type)) return { image: null, note: `img HTTP ${r.status} ${type.slice(0, 20)}` };
    return { image: `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`, note: "img ok" };
  } catch (e) {
    return { image: null, note: `img ${(e as Error).name}` };
  }
}

async function captchaChallenge(form: LoginForm, jar: Jar, message: string): Promise<EmaktabResult> {
  let f = form;
  // В ответе на вход картинки может не быть — берём свежую форму входа (у неё своя капча и Captcha.Id).
  if (!f.captchaUrl) {
    const page = await go(`${LOGIN}login`, jar, { headers: { referer: LOGIN } }).catch(() => null);
    const fresh = page ? parseLoginForm(page.body, page.url) : null;
    if (fresh) f = fresh;
  }
  const captchaId = f.hidden["Captcha.Id"] || f.captchaUrl?.match(/\/captcha\/[^/]+\/([^/?#]+)/)?.[1] || "";
  const urls = [f.captchaUrl, captchaId ? `${LOGIN}captcha/true/${captchaId}` : null].filter((u): u is string => Boolean(u));
  let image: string | null = null;
  const notes: string[] = [`url ${f.captchaUrl ? "found" : "none"}`, `id ${captchaId ? "yes" : "no"}`];
  for (const u of [...new Set(urls)]) {
    const r = await fetchImage(u, jar);
    notes.push(r.note);
    if ((image = r.image)) break;
  }
  if (!image) {
    notes.push(captchaSnippets(lastCaptchaHtml));
    console.error("[emaktab] капча без картинки:", notes.join(", "));
  }
  return { status: "captcha", image, message, state: seal({ jar, action: f.action, hidden: { ...f.hidden, "Captcha.Id": captchaId } }), ...(image ? {} : { diag: notes.join(" · ") }) };
}

async function submit(form: { action: string; hidden: Record<string, string> }, jar: Jar, login: string, password: string, captcha?: string): Promise<Page> {
  const fields: Record<string, string> = {
    exceededAttempts: "False", ReturnUrl: "", FingerprintId: "", "Captcha.Input": "", "Captcha.Id": "",
    ...form.hidden, login, password,
  };
  if (captcha) fields["Captcha.Input"] = captcha.trim();
  if (!fields.FingerprintId) fields.FingerprintId = createHash("sha256").update(`uh|${login}`).digest("hex").slice(0, 32);
  return go(form.action, jar, {
    method: "POST",
    body: new URLSearchParams(fields).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded", origin: new URL(form.action).origin, referer: LOGIN },
  });
}

const authed = (jar: Jar) => Object.keys(jar).some((k) => /^UZDnevnikAuth_/i.test(k));

/** Вход: ok (cookie в jar) или ответ для ученика. */
async function signIn(login: string, password: string, captcha?: { answer: string; state: string }): Promise<{ jar: Jar } | EmaktabResult> {
  let jar: Jar = {};
  let form: LoginForm | { action: string; hidden: Record<string, string> };
  if (captcha) {
    const st = unseal<{ jar: Jar; action: string; hidden: Record<string, string> }>(captcha.state);
    if (!st) return { status: "error", message: "Код с картинки устарел. Нажми «Войти» ещё раз." };
    jar = st.jar;
    form = { action: st.action, hidden: st.hidden };
  } else {
    let page = await go(LOGIN, jar, { headers: { referer: LOGIN } });
    let f = parseLoginForm(page.body, page.url);
    if (!f) {
      // Главная входа может быть заставкой — форма на /login.
      page = await go(`${LOGIN}login`, jar, { headers: { referer: LOGIN } });
      f = parseLoginForm(page.body, page.url);
    }
    if (!f && (page.status === 503 || /технические работы|texnik ishlar/i.test(page.body)))
      return { status: "error", message: "В eMaktab сейчас идут технические работы — сайт временно не пускает. Попробуй позже или загрузи скриншот оценок." };
    if (!f) {
      const title = page.body.match(/<title[^>]*>([^<]{0,80})/i)?.[1]?.trim() ?? "";
      const text = page.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
      console.error("[emaktab] нет формы входа", page.status, new URL(page.url).host + new URL(page.url).pathname, title);
      return { status: "error", message: "eMaktab не показал форму входа. Возможно, сайт обновился — попробуй загрузить скриншот оценок.", diag: `HTTP ${page.status} · ${new URL(page.url).host}${new URL(page.url).pathname} · «${title}» · ${text}` };
    }
    if (f.captcha) return captchaChallenge(f, jar, "eMaktab просит ввести код с картинки.");
    form = f;
  }
  const res = await submit(form, jar, login, password, captcha?.answer);
  const again = parseLoginForm(res.body, res.url);
  const err = loginErrors(res.body);
  if (authed(jar) && !err.wrong && !again) return { jar };
  if (!authed(jar) && !again && /__2FA__|two.?factor|tasdiqla/i.test(res.body))
    return { status: "confirm", message: "eMaktab просит подтвердить вход (телефон, Telegram или контрольный вопрос). Войди один раз на login.emaktab.uz, подтверди и повтори импорт." };
  if (err.captcha || again?.captcha) return captchaChallenge(again ?? (form as LoginForm), jar, captcha ? "Код с картинки не подошёл, попробуй ещё раз." : "eMaktab просит ввести код с картинки.");
  if (err.wrong) return { status: "invalid", message: "Неверный логин или пароль eMaktab." };
  if (!again) return { jar };
  return { status: "error", message: "eMaktab не принял вход. Проверь логин и пароль на login.emaktab.uz и попробуй ещё раз." };
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
