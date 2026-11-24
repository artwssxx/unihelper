import { createHmac, timingSafeEqual } from "node:crypto";
import { safePath } from "./client";

export { safePath };

// Логика Telegram-бота без сети: разбор команд, ссылки привязки, тексты и клавиатуры.
// Сетевые вызовы — в lib/server/tgBot.ts.

export interface TgUserLite { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string }
export interface TgMessage { message_id: number; chat: { id: number; type: string }; from?: TgUserLite; text?: string; date: number }
export interface TgCallback { id: string; from: TgUserLite; data?: string; message?: TgMessage }
export interface TgUpdate { update_id: number; message?: TgMessage; callback_query?: TgCallback }

export type InlineButton = { text: string; web_app?: { url: string }; url?: string; callback_data?: string };
export type Keyboard = { inline_keyboard: InlineButton[][] };

/** «/start@unihelperapp_bot l123…» → { cmd: "start", arg: "l123…" }. */
export function parseCommand(text: string | undefined): { cmd: string; arg: string } | null {
  if (!text?.startsWith("/")) return null;
  const m = text.trim().match(/^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), arg: (m[2] ?? "").trim() };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


export function appUrl(site: string, to = "/dashboard"): string {
  return `${site}/tg?to=${encodeURIComponent(safePath(to))}`;
}

// ── Привязка аккаунта сайта к Telegram через /start <код> ──
// Код: «l» + id пользователя без дефисов (32) + срок в base36 (7) + подпись (16). Итого 56 символов —
// влезает в лимит параметра /start (64, только [A-Za-z0-9_-]).

function sig(body: string, secret: string) {
  return createHmac("sha256", secret).update(`tg-link:${body}`).digest("hex").slice(0, 16);
}

export function makeLinkCode(userId: string, secret: string, now = Date.now(), ttlSec = 3600): string {
  const hex = userId.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error("bad user id");
  const exp = Math.floor(now / 1000 + ttlSec).toString(36).padStart(7, "0");
  const body = `${hex}${exp}`;
  return `l${body}${sig(body, secret)}`;
}

export function readLinkCode(code: string, secret: string, now = Date.now()): string | null {
  const m = code.match(/^l([0-9a-f]{32})([0-9a-z]{7})([0-9a-f]{16})$/);
  if (!m) return null;
  const [, hex, exp, s] = m;
  const want = Buffer.from(sig(`${hex}${exp}`, secret));
  const got = Buffer.from(s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (parseInt(exp, 36) * 1000 < now) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Тексты ──

export const COMMANDS = [
  { command: "app", description: "Открыть UniHelper" },
  { command: "plan", description: "Шаги на этот месяц" },
  { command: "mocks", description: "Мои моки SAT и IELTS" },
  { command: "notify", description: "Включить или выключить напоминания" },
  { command: "help", description: "Что умеет бот" },
];

export function mainKeyboard(site: string): Keyboard {
  return {
    inline_keyboard: [
      [{ text: "Открыть UniHelper", web_app: { url: appUrl(site, "/dashboard") } }],
      [
        { text: "Подбор вузов", web_app: { url: appUrl(site, "/programs") } },
        { text: "Моки", web_app: { url: appUrl(site, "/mocks") } },
      ],
      [
        { text: "Комьюнити", web_app: { url: appUrl(site, "/community") } },
        { text: "Курсы", url: `${site}/courses` },
      ],
    ],
  };
}

export function welcomeText(name?: string): string {
  return [
    `<b>${name ? `Привет, ${escapeHtml(name)}!` : "Привет!"}</b> Я бот UniHelper — помогаю поступить за рубеж на грант по плану.`,
    "",
    "Что умею:",
    "• открыть UniHelper прямо в Telegram — подбор вузов, моки, дорожная карта, комьюнити;",
    "• /plan — шаги на этот месяц;",
    "• /mocks — последние результаты моков;",
    "• раз в неделю напомню о плане и ивентах (/notify — выключить);",
    "• напиши вопрос обычным сообщением — ответит AI Advisor по твоему профилю.",
    "",
    "Суммы и сроки грантов всегда сверяй на официальных сайтах.",
  ].join("\n");
}

export const HELP_TEXT = [
  "<b>Команды</b>",
  "/app — открыть UniHelper",
  "/plan — шаги на этот месяц",
  "/mocks — последние моки",
  "/notify — напоминания вкл/выкл",
  "",
  "Вопрос можно написать обычным сообщением — ответит AI Advisor. Он не пишет эссе за тебя и не выдумывает дедлайны.",
].join("\n");

export const NEED_LOGIN_TEXT = "Я пока не знаю твой профиль. Открой UniHelper кнопкой ниже — вход займёт секунду, и я смогу показывать план и моки.";

export interface DigestStep { title: string; month: string; overdue: boolean }
export interface DigestEvent { title: string; date: string }

export function digestText(name: string | null, steps: DigestStep[], events: DigestEvent[]): string | null {
  if (!steps.length && !events.length) return null;
  const out = [`<b>${name ? `${escapeHtml(name)}, план` : "План"} на эту неделю</b>`];
  const overdue = steps.filter((s) => s.overdue);
  if (overdue.length) out.push("", `Просрочено: ${overdue.length}. Начни с них:`);
  for (const s of steps.slice(0, 6)) out.push(`${s.overdue ? "•" : "◦"} ${escapeHtml(s.title)} — ${escapeHtml(s.month)}`);
  if (events.length) {
    out.push("", "<b>Ивенты, на которые ты записан</b>");
    for (const e of events.slice(0, 4)) out.push(`• ${escapeHtml(e.title)} — ${escapeHtml(e.date)}`);
  }
  out.push("", "Отметить шаги можно в дорожной карте. Выключить напоминания — /notify.");
  return out.join("\n");
}

export function newMessageText(author: string, body: string, isOrg: boolean, orgName?: string): string {
  const where = isOrg && orgName ? ` в чате «${escapeHtml(orgName)}»` : "";
  const preview = body.length > 140 ? `${body.slice(0, 140)}…` : body;
  return `<b>Новое сообщение от ${escapeHtml(author)}</b>${where}\n\n${escapeHtml(preview)}`;
}
