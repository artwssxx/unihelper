import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRegistration, MockHistoryItem, StepStatus } from "@/lib/clientStore";
import type { EventItem } from "@/lib/content/events";
import { buildRoadmap, effectiveStatus, monthLabel } from "@/lib/roadmap";
import { SITE_URL } from "@/lib/site";
import {
  appUrl, COMMANDS, digestText, HELP_TEXT, mainKeyboard, NEED_LOGIN_TEXT, newMessageText, parseCommand, readLinkCode, welcomeText,
  type DigestEvent, type DigestStep, type Keyboard, type TgUpdate,
} from "@/lib/telegram/bot";
import type { Profile, Program } from "@/lib/types";
import { aiEnabled, streamChat } from "./ai";
import { getContent } from "./contentStore";
import { takeQuota } from "./rateLimit";
import { supabaseAdmin } from "./supabase";

// Telegram-бот UniHelper: команды, привязка аккаунта, ответы ИИ, напоминания и уведомления.

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
const apiBase = () => (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/$/, "");
export const botEnabled = () => Boolean(token());

/** Секрет вебхука: Telegram присылает его в заголовке X-Telegram-Bot-Api-Secret-Token. */
export function webhookSecret(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET || createHash("sha256").update(`webhook:${token()}`).digest("hex").slice(0, 48);
}
/** Ключ подписи кодов привязки аккаунта (/start l…). */
export function linkSecret(): string {
  return createHash("sha256").update(`link:${token()}`).digest("hex");
}

export async function tg<T = unknown>(method: string, payload: Record<string, unknown>): Promise<{ ok: boolean; result?: T; description?: string }> {
  if (!botEnabled()) return { ok: false, description: "no_token" };
  try {
    const res = await fetch(`${apiBase()}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; result?: T; description?: string };
    if (!j.ok) console.error(`[tg] ${method}`, j.description);
    return j;
  } catch (e) {
    console.error(`[tg] ${method}`, (e as Error).message);
    return { ok: false, description: "network" };
  }
}

export const send = (chatId: number, text: string, keyboard?: Keyboard) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(keyboard ? { reply_markup: keyboard } : {}) });

const openKb = (label = "Открыть UniHelper", to = "/dashboard"): Keyboard => ({ inline_keyboard: [[{ text: label, web_app: { url: appUrl(SITE_URL, to) } }]] });

type StateRow = { user_id: string; data: Record<string, unknown> | null; display_name: string | null; tg_notify: boolean; telegram_id: number | null };

async function stateByTelegram(db: SupabaseClient, tgId: number): Promise<StateRow | null> {
  const { data } = await db.from("user_state").select("user_id,data,display_name,tg_notify,telegram_id").eq("telegram_id", tgId).maybeSingle();
  return (data as StateRow) ?? null;
}

const firstName = (row: { display_name: string | null } | null, fallback?: string) => (row?.display_name || fallback || "").split(/\s+/)[0] || null;

// ── План и моки ──

export async function planSteps(data: Record<string, unknown>, now = new Date()): Promise<DigestStep[]> {
  const profile = data.profile as Profile | undefined;
  if (!profile) return [];
  const programs = (await getContent("programs")) as Program[];
  const stored = (data.roadmap ?? {}) as Record<string, StepStatus>;
  const horizon = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().slice(0, 10);
  return buildRoadmap(profile, (data.myPrograms as string[]) ?? [], now, programs)
    .map((i) => ({ i, st: effectiveStatus(i, stored[i.id], now) }))
    .filter(({ i, st }) => st !== "done" && i.due < horizon)
    .sort((a, b) => Number(b.st === "overdue") - Number(a.st === "overdue") || a.i.due.localeCompare(b.i.due))
    .map(({ i, st }) => ({ title: i.title, month: monthLabel(i.due), overdue: st === "overdue" }));
}

export async function upcomingEvents(data: Record<string, unknown>, now = new Date(), days = 14): Promise<DigestEvent[]> {
  const regs = (data.events ?? {}) as Record<string, EventRegistration>;
  const ids = Object.entries(regs).filter(([, r]) => r.status === "registered").map(([id]) => id);
  if (!ids.length) return [];
  const events = (await getContent("events")) as EventItem[];
  const until = now.getTime() + days * 86400_000;
  return events
    .filter((e) => ids.includes(e.id) && new Date(e.startsAt).getTime() >= now.getTime() && new Date(e.startsAt).getTime() <= until)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((e) => ({ title: e.title, date: new Date(e.startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Tashkent" }) }));
}

function mocksText(data: Record<string, unknown>): string {
  const mocks = ((data.mocks ?? []) as MockHistoryItem[]).filter((m) => m.status === "completed").slice(-5).reverse();
  if (!mocks.length) return "Моков пока нет. Первый мок займёт 30–60 минут — результат будет примерной оценкой, а не официальным баллом.";
  const name = (m: MockHistoryItem) => (m.exam === "sat" ? `SAT ${m.section === "math" ? "Math" : "Reading & Writing"}` : `IELTS ${m.section === "reading" ? "Reading" : "Writing"}`);
  const score = (m: MockHistoryItem) => (m.band != null ? `band ${m.band}` : m.scoreLow != null ? `${m.scoreLow}–${m.scoreHigh}` : "без оценки");
  return ["<b>Последние моки</b> (примерная оценка)", ...mocks.map((m) => `• ${name(m)}: ${score(m)} — ${new Date(m.finishedAt).toLocaleDateString("ru-RU")}`)].join("\n");
}

// ── Обработка обновления ──

export async function handleUpdate(u: TgUpdate): Promise<void> {
  const db = supabaseAdmin();
  if (u.callback_query) {
    const cq = u.callback_query;
    if (cq.data?.startsWith("notify:") && db) {
      const on = cq.data === "notify:on";
      const row = await stateByTelegram(db, cq.from.id);
      if (row) await db.from("user_state").update({ tg_notify: on }).eq("user_id", row.user_id);
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: row ? (on ? "Напоминания включены" : "Напоминания выключены") : "Сначала войди в UniHelper" });
    } else await tg("answerCallbackQuery", { callback_query_id: cq.id });
    return;
  }
  const m = u.message;
  if (!m?.from || m.chat.type !== "private") return;
  const chatId = m.chat.id;
  const from = m.from;
  const cmd = parseCommand(m.text);

  if (cmd?.cmd === "start" && cmd.arg.startsWith("l")) {
    const userId = readLinkCode(cmd.arg, linkSecret());
    if (!userId || !db) {
      await send(chatId, "Ссылка для подключения устарела. Открой профиль на сайте и нажми «Подключить Telegram» ещё раз.");
      return;
    }
    await db.from("user_state").update({ telegram_id: null }).eq("telegram_id", from.id).neq("user_id", userId);
    const { error } = await db
      .from("user_state")
      .upsert({ user_id: userId, telegram_id: from.id, telegram_username: from.username ?? null, tg_notify: true, tg_linked_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      console.error("[tg] link", error.message);
      await send(chatId, "Не получилось подключить аккаунт. Попробуй ещё раз через минуту.");
      return;
    }
    await send(chatId, "<b>Аккаунт подключён.</b> Буду присылать план на неделю и уведомления о новых сообщениях в комьюнити. Выключить — /notify.", mainKeyboard(SITE_URL));
    return;
  }

  if (cmd?.cmd === "start" || cmd?.cmd === "app" || cmd?.cmd === "menu") {
    await send(chatId, cmd.cmd === "start" ? welcomeText(from.first_name) : "Открыть UniHelper:", mainKeyboard(SITE_URL));
    return;
  }
  if (cmd?.cmd === "help") {
    await send(chatId, HELP_TEXT, mainKeyboard(SITE_URL));
    return;
  }

  const row = db ? await stateByTelegram(db, from.id) : null;
  const data = (row?.data ?? {}) as Record<string, unknown>;

  if (cmd?.cmd === "plan") {
    if (!row) return void (await send(chatId, NEED_LOGIN_TEXT, openKb("Войти через Telegram")));
    if (!data.profile) return void (await send(chatId, "Сначала пройди оценку профиля — 3 минуты, и я соберу план по месяцам.", openKb("Оценить профиль", "/quiz")));
    const steps = await planSteps(data);
    const text = steps.length
      ? ["<b>Шаги на ближайшие два месяца</b>", ...steps.slice(0, 8).map((s) => `${s.overdue ? "• просрочено:" : "•"} ${s.title} — ${s.month}`)].join("\n")
      : "На ближайшие два месяца всё сделано. Загляни в дорожную карту — там шаги на весь сезон.";
    await send(chatId, text, openKb("Открыть дорожную карту", "/roadmap"));
    return;
  }
  if (cmd?.cmd === "mocks") {
    if (!row) return void (await send(chatId, NEED_LOGIN_TEXT, openKb("Войти через Telegram")));
    await send(chatId, mocksText(data), openKb("Пройти мок", "/mocks"));
    return;
  }
  if (cmd?.cmd === "notify" || cmd?.cmd === "stop") {
    if (!row || !db) return void (await send(chatId, NEED_LOGIN_TEXT, openKb("Войти через Telegram")));
    const on = cmd.cmd === "stop" ? false : !row.tg_notify;
    await db.from("user_state").update({ tg_notify: on }).eq("user_id", row.user_id);
    await send(chatId, on ? "Напоминания включены: раз в неделю пришлю план, а ещё — новые сообщения из комьюнити." : "Напоминания выключены. Включить снова — /notify.");
    return;
  }
  if (cmd) {
    await send(chatId, HELP_TEXT);
    return;
  }

  // Обычное сообщение — вопрос для AI Advisor.
  const q = (m.text ?? "").trim();
  if (!q) return;
  if (!row || !data.profile) {
    await send(chatId, "Чтобы ответить по делу, мне нужен твой профиль. Открой UniHelper и пройди оценку — это 3 минуты.", openKb("Оценить профиль", "/quiz"));
    return;
  }
  if (!aiEnabled()) {
    await send(chatId, "AI Advisor сейчас недоступен. Посмотри план (/plan) или открой приложение.", mainKeyboard(SITE_URL));
    return;
  }
  if (!takeQuota(`tg:${from.id}:ai`, 15).ok) {
    await send(chatId, "На сегодня вопросы закончились. Продолжить можно в приложении.", openKb("Открыть AI Advisor", "/assistant"));
    return;
  }
  await tg("sendChatAction", { chat_id: chatId, action: "typing" });
  const reader = streamChat(data.profile as Profile, [{ role: "user", content: q.slice(0, 2000) }]).getReader();
  const dec = new TextDecoder();
  let answer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    answer += dec.decode(value, { stream: true });
  }
  answer = answer.replace(/\*\*(.+?)\*\*/g, "$1").trim().slice(0, 3800) || "Не получилось ответить. Попробуй переформулировать вопрос.";
  await tg("sendMessage", { chat_id: chatId, text: answer, link_preview_options: { is_disabled: true }, reply_markup: openKb("Продолжить в приложении", "/assistant") });
}

// ── Уведомления о сообщениях комьюнити ──

/** Шлём одно уведомление на «серию» непрочитанных: следующее — только после того, как участник откроет чат. */
export async function notifyNewMessage(db: SupabaseClient, chatId: string, senderId: string, body: string): Promise<void> {
  if (!botEnabled()) return;
  const { data: members } = await db.from("community_chat_members").select("user_id,last_read_at,notified_at").eq("chat_id", chatId).neq("user_id", senderId);
  const now = Date.now();
  const eligible = (members ?? []).filter(
    (m) => now - new Date(m.last_read_at).getTime() > 60_000 && (!m.notified_at || new Date(m.notified_at) <= new Date(m.last_read_at)),
  );
  if (!eligible.length) return;
  const { data: states } = await db
    .from("user_state")
    .select("user_id,telegram_id")
    .in("user_id", eligible.map((m) => m.user_id))
    .not("telegram_id", "is", null)
    .eq("tg_notify", true);
  if (!states?.length) return;
  const [{ data: chat }, { data: sender }] = await Promise.all([
    db.from("community_chats").select("kind,org_id").eq("id", chatId).maybeSingle(),
    db.from("community_profiles").select("display_name,hidden_by_admin").eq("user_id", senderId).maybeSingle(),
  ]);
  const orgName = chat?.kind === "org" && chat.org_id ? (await db.from("community_orgs").select("name").eq("id", chat.org_id).maybeSingle()).data?.name : undefined;
  const author = sender && !sender.hidden_by_admin ? sender.display_name : "Участник";
  const text = newMessageText(author, body, chat?.kind === "org", orgName);
  for (const s of states) {
    const r = await send(s.telegram_id as number, text, openKb("Открыть чат", `/community/chats?c=${chatId}`));
    if (r.ok) await db.from("community_chat_members").update({ notified_at: new Date().toISOString() }).eq("chat_id", chatId).eq("user_id", s.user_id);
  }
}

// ── Еженедельный дайджест ──

export async function sendDigests(limit = 300): Promise<{ checked: number; sent: number }> {
  const db = supabaseAdmin();
  if (!db || !botEnabled()) return { checked: 0, sent: 0 };
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString();
  const { data } = await db
    .from("user_state")
    .select("user_id,data,display_name,telegram_id,tg_last_digest_at")
    .not("telegram_id", "is", null)
    .eq("tg_notify", true)
    .or(`tg_last_digest_at.is.null,tg_last_digest_at.lt.${weekAgo}`)
    .limit(limit);
  let sent = 0;
  for (const row of data ?? []) {
    const d = (row.data ?? {}) as Record<string, unknown>;
    if (d.demo) continue;
    const text = digestText(firstName(row), await planSteps(d), await upcomingEvents(d));
    if (text) {
      const r = await send(row.telegram_id as number, text, openKb("Открыть дорожную карту", "/roadmap"));
      if (r.ok) sent++;
    }
    await db.from("user_state").update({ tg_last_digest_at: new Date().toISOString() }).eq("user_id", row.user_id);
  }
  return { checked: data?.length ?? 0, sent };
}

// ── Настройка бота (из админки) ──

export async function setupBot(): Promise<{ ok: boolean; steps: { name: string; ok: boolean; note?: string }[] }> {
  const steps: { name: string; ok: boolean; note?: string }[] = [];
  const run = async (name: string, method: string, payload: Record<string, unknown>) => {
    const r = await tg(method, payload);
    steps.push({ name, ok: r.ok, note: r.description });
  };
  await run("Вебхук", "setWebhook", { url: `${SITE_URL}/api/telegram/webhook`, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  await run("Команды", "setMyCommands", { commands: COMMANDS, language_code: "" });
  await run("Кнопка меню", "setChatMenuButton", { menu_button: { type: "web_app", text: "UniHelper", web_app: { url: `${SITE_URL}/tg` } } });
  await run("Описание", "setMyDescription", { description: "UniHelper помогает поступить за рубеж на грант: подбор вузов с честной оценкой, моки SAT и IELTS, план по месяцам и комьюнити. Нажми «Старт»." });
  await run("Короткое описание", "setMyShortDescription", { short_description: "Поступление за рубеж на грант — по плану. Подбор вузов, моки, комьюнити." });
  return { ok: steps.every((s) => s.ok), steps };
}

export async function botStatus() {
  const [me, hook] = await Promise.all([tg<{ username: string; first_name: string }>("getMe", {}), tg<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo", {})]);
  return {
    configured: botEnabled(),
    username: me.result?.username ?? null,
    webhook: hook.result?.url ?? null,
    webhookOk: hook.result?.url === `${SITE_URL}/api/telegram/webhook`,
    pending: hook.result?.pending_update_count ?? 0,
    lastError: hook.result?.last_error_message ?? null,
  };
}
