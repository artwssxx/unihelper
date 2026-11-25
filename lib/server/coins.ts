import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ACHIEVEMENTS, DAILY_BONUS, QUESTS, REPEAT, SHOP, SOCIALS, TASKS, levelOf, type CoinState, type ShopItemId, type TaskId } from "@/lib/coins";
import { metricsOf, planAwards, type Baselines, type StudentData } from "@/lib/coinProgress";
import { getUser, type AuthUser } from "./auth";
import { PLAN_COOKIE, savePlanForUser, signPlan } from "./plan";
import { supabaseAdmin } from "./supabase";
import { tg } from "./tgBot";

// UniCoins на сервере: начисления только через функции БД (идемпотентно), списания — с блокировкой.

export type CoinCtx = { user: AuthUser; db: SupabaseClient };

export async function coinCtx(req: Request): Promise<CoinCtx | NextResponse> {
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503 });
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized", message: "Войдите, чтобы копить UniCoins." }, { status: 401 });
  return { user, db };
}

/** Начислить один раз за (reason, ref). Возвращает true, если начислено. */
export async function award(db: SupabaseClient, userId: string, amount: number, reason: string, ref: string): Promise<boolean> {
  const { data, error } = await db.rpc("coin_award", { uid: userId, amount, why: reason, r: ref.slice(0, 80) });
  if (error) console.error("[coins] award", error.message);
  return data === true;
}

export async function balanceOf(db: SupabaseClient, userId: string): Promise<number> {
  const { data } = await db.rpc("coin_balance", { uid: userId });
  return typeof data === "number" ? data : 0;
}

/** Использовать разовое открытие (если куплено). */
export async function takeUnlock(db: SupabaseClient, userId: string, kind: ShopItemId, ref = ""): Promise<boolean> {
  const { data, error } = await db.rpc("coin_take_unlock", { uid: userId, k: kind, r: ref });
  if (error) console.error("[coins] unlock", error.message);
  return data === true;
}

/** Есть ли у запроса пользователь с открытием этого вида — и сразу использовать его. */
export async function consumeUnlock(req: Request, kind: ShopItemId, ref = ""): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const user = await getUser(req);
  return user ? takeUnlock(db, user.id, kind, ref) : false;
}

/** Есть ли у пользователя запроса неиспользованные открытия этого вида (без траты). */
export async function hasUnlockFromRequest(req: Request, kind: ShopItemId): Promise<boolean> {
  const db = supabaseAdmin();
  const user = db ? await getUser(req) : null;
  if (!db || !user) return false;
  const { data } = await db.from("coin_unlocks").select("id").eq("user_id", user.id).eq("kind", kind).gt("remaining", 0).limit(1);
  return Boolean(data?.length);
}

const tashkentToday = () => new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);

export async function checkin(db: SupabaseClient, userId: string): Promise<{ awarded: number; streak: number }> {
  const { data, error } = await db.rpc("coin_checkin", { uid: userId, today: tashkentToday() });
  if (error) {
    console.error("[coins] checkin", error.message);
    return { awarded: 0, streak: 0 };
  }
  return data as { awarded: number; streak: number };
}

export function refCodeFor(userId: string): string {
  return createHash("sha256").update(`ref:${userId}`).digest("base64url").replace(/[-_]/g, "").slice(0, 8).toLowerCase();
}

async function ensureRefCode(db: SupabaseClient, userId: string, current: string | null): Promise<string> {
  if (current) return current;
  const code = refCodeFor(userId);
  await db.from("user_state").upsert({ user_id: userId, ref_code: code }, { onConflict: "user_id" });
  return code;
}

/** Проверка заданий: что уже выполнено (по данным сервера). */
async function taskDone(db: SupabaseClient, userId: string, st: Record<string, unknown> | null, claimed: Set<string>): Promise<Record<TaskId, boolean>> {
  const data = (st?.data ?? {}) as { profile?: unknown; mocks?: { status: string }[] };
  const [card, site] = await Promise.all([
    db.from("community_profiles").select("user_id").eq("user_id", userId).maybeSingle(),
    db.from("portfolio_sites").select("visibility,content").eq("user_id", userId).maybeSingle(),
  ]);
  const content = (site.data?.content ?? {}) as { hideBadge?: boolean };
  return {
    profile: Boolean(data.profile),
    telegram_bot: Boolean(st?.telegram_id),
    telegram_channel: claimed.has("telegram_channel"),
    instagram: claimed.has("instagram"),
    tiktok: claimed.has("tiktok"),
    youtube: claimed.has("youtube"),
    community_card: Boolean(card.data),
    portfolio_public: site.data?.visibility === "public" && !content.hideBadge,
    first_mock: (data.mocks ?? []).some((m) => m.status === "completed"),
    feedback: claimed.has("feedback"),
  };
}

/** Видимые задания: соцсети — только если указана ссылка. */
export function visibleTasks() {
  return TASKS.filter((t) => {
    if (t.id === "instagram") return Boolean(SOCIALS.instagram);
    if (t.id === "tiktok") return Boolean(SOCIALS.tiktok);
    if (t.id === "youtube") return Boolean(SOCIALS.youtube);
    if (t.id === "telegram_channel") return Boolean(SOCIALS.telegramChannel && process.env.TELEGRAM_BOT_TOKEN);
    return true;
  });
}

type LedgerRow = { delta: number; reason: string; ref: string; created_at: string };

/** Монеты за прогресс и достижения: считаем по данным ученика на сервере и начисляем новое (идемпотентно). */
async function syncProgress(db: SupabaseClient, userId: string, st: { data?: unknown; streak_days?: number | null; coin_progress?: unknown } | null, ledger: LedgerRow[]) {
  const today = tashkentToday();
  const isToday = (r: LedgerRow) => new Date(new Date(r.created_at).getTime() + 5 * 3600_000).toISOString().slice(0, 10) === today;
  const data = (st?.data ?? {}) as StudentData;
  const metrics = metricsOf(data, st?.streak_days ?? 0, ledger.filter((r) => r.reason === "invite").length);
  const base = (st?.coin_progress ?? {}) as Baselines;
  const plan = planAwards({
    data,
    metrics,
    base,
    given: new Set(ledger.map((r) => `${r.reason}:${r.ref}`)),
    todayReasons: new Set(ledger.filter(isToday).map((r) => r.reason)),
    stepsToday: ledger.filter((r) => r.reason === "step" && isToday(r)).length,
    xp: ledger.reduce((s, r) => s + Math.max(0, r.delta), 0),
    today,
  });
  // Начисления независимы (каждое идемпотентно по reason+ref) — отправляем параллельно.
  const [given] = await Promise.all([
    Promise.all(plan.awards.map((a) => award(db, userId, a.amount, a.reason, a.ref))),
    JSON.stringify(plan.base) !== JSON.stringify(base) ? db.from("user_state").update({ coin_progress: plan.base }).eq("user_id", userId) : null,
  ]);
  const now = new Date().toISOString();
  const fresh: LedgerRow[] = plan.awards.filter((_, i) => given[i]).map((a) => ({ delta: a.amount, reason: a.reason, ref: a.ref, created_at: now }));
  return { fresh, metrics };
}

export async function coinState(db: SupabaseClient, userId: string): Promise<CoinState> {
  const [{ data: st }, { data: rows }, { data: unlocks }] = await Promise.all([
    db.from("user_state").select("data,telegram_id,streak_days,streak_last,ref_code,coin_progress").eq("user_id", userId).maybeSingle(),
    db.from("coin_ledger").select("delta,reason,ref,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5000),
    db.from("coin_unlocks").select("kind,ref,remaining").eq("user_id", userId).gt("remaining", 0),
  ]);
  const claimed = new Set((rows ?? []).filter((r) => r.reason === "task").map((r) => r.ref));
  const [{ fresh, metrics }, done, refCode] = await Promise.all([
    syncProgress(db, userId, st, rows ?? []),
    taskDone(db, userId, st, claimed),
    ensureRefCode(db, userId, st?.ref_code ?? null),
  ]);
  const ledger = [...fresh, ...(rows ?? [])];
  const balance = ledger.reduce((s, r) => s + r.delta, 0);
  const xp = ledger.reduce((s, r) => s + Math.max(0, r.delta), 0);
  const today = tashkentToday();
  const todayReasons = new Set(ledger.filter((r) => new Date(new Date(r.created_at).getTime() + 5 * 3600_000).toISOString().slice(0, 10) === today).map((r) => r.reason));
  const gotAch = new Set(ledger.filter((r) => r.reason === "ach").map((r) => r.ref));
  const credits: CoinState["unlocks"]["credits"] = {};
  for (const u of unlocks ?? []) credits[u.kind as ShopItemId] = (credits[u.kind as ShopItemId] ?? 0) + u.remaining;
  return {
    balance,
    streak: st?.streak_last && st.streak_last >= new Date(Date.now() + 5 * 3600_000 - 86400_000).toISOString().slice(0, 10) ? st.streak_days : 0,
    checkedInToday: st?.streak_last === today,
    tasks: visibleTasks().map((t) => ({ ...t, status: claimed.has(t.id) ? "claimed" : t.kind === "auto" && t.id !== "telegram_channel" && done[t.id] ? "ready" : "todo" })),
    refCode,
    invited: ledger.filter((r) => r.reason === "invite").length,
    history: ledger.slice(0, 30).map((r) => ({ delta: r.delta, reason: r.reason === "task" ? `task:${r.ref}` : r.reason === "spend" ? `spend:${r.ref.split(":")[0]}` : r.reason, at: r.created_at })),
    unlocks: {
      fitReasons: (unlocks ?? []).filter((u) => u.kind === "fit_reasons").map((u) => u.ref),
      portfolioPro: (unlocks ?? []).some((u) => u.kind === "portfolio_pro"),
      credits,
    },
    level: levelOf(xp),
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, value: metrics[a.metric] ?? 0, done: gotAch.has(a.id) })),
    quests: QUESTS.map((q) => ({ id: q.id, title: q.title, done: todayReasons.has(q.id) })),
    dailyBonus: { reward: DAILY_BONUS, done: ledger.some((r) => r.reason === "daily" && r.ref === today) },
    fresh: fresh.map((r) => ({ delta: r.delta, reason: r.reason })),
  };
}

/** Забрать награду за задание: сервер сам проверяет выполнение (кроме подписок на соцсети без API). */
export async function claimTask(db: SupabaseClient, userId: string, id: TaskId): Promise<{ ok: boolean; message?: string; awarded?: number }> {
  const task = visibleTasks().find((t) => t.id === id);
  if (!task) return { ok: false, message: "Такого задания нет." };
  const { data: st } = await db.from("user_state").select("data,telegram_id").eq("user_id", userId).maybeSingle();
  if (task.kind === "auto") {
    if (id === "telegram_channel") {
      if (!st?.telegram_id) return { ok: false, message: "Сначала подключи Telegram-бот в профиле." };
      const r = await tg<{ status: string }>("getChatMember", { chat_id: SOCIALS.telegramChannel, user_id: st.telegram_id });
      if (!r.ok || !["member", "administrator", "creator"].includes(r.result?.status ?? "")) return { ok: false, message: "Подписка не найдена. Подпишись на канал и попробуй ещё раз." };
    } else {
      const done = await taskDone(db, userId, st, new Set());
      if (!done[id]) return { ok: false, message: "Задание ещё не выполнено." };
    }
  }
  if (task.kind === "form") return { ok: false, message: "Это задание выполняется через форму." };
  const ok = await award(db, userId, task.reward, "task", id);
  return ok ? { ok: true, awarded: task.reward } : { ok: false, message: "Награда за это задание уже получена." };
}

/** Покупка в магазине: списание + выдача (Pro на время или разовое открытие). */
export async function buy(db: SupabaseClient, userId: string, id: ShopItemId, ref = ""): Promise<{ ok: true; balance: number; planCookie?: { value: string; expires: Date } } | { ok: false; message: string }> {
  const item = SHOP.find((s) => s.id === id);
  if (!item) return { ok: false, message: "Нет такого товара." };
  if (item.perRef && !/^[a-z0-9-]{2,64}$/.test(ref)) return { ok: false, message: "Не указан объект покупки." };
  if (item.perRef || id === "portfolio_pro") {
    const { data: has } = await db.from("coin_unlocks").select("id").eq("user_id", userId).eq("kind", id).eq("ref", item.perRef ? ref : "").gt("remaining", 0).maybeSingle();
    if (has) return { ok: false, message: "Уже открыто." };
  }
  const { data: bal, error } = await db.rpc("coin_spend", { uid: userId, amount: item.price, why: "spend", r: `${id}:${ref}:${Date.now()}` });
  if (error) return { ok: false, message: "Не получилось, попробуйте ещё раз." };
  if (bal === -1) return { ok: false, message: `Не хватает UniCoins: нужно ${item.price}.` };
  if (id === "pro_day" || id === "pro_week") {
    const { data: st } = await db.from("user_state").select("plan,plan_expires_at").eq("user_id", userId).maybeSingle();
    const from = st?.plan === "pro" && st.plan_expires_at && new Date(st.plan_expires_at).getTime() > Date.now() ? new Date(st.plan_expires_at).getTime() : Date.now();
    const exp = from + (id === "pro_day" ? 1 : 7) * 86400_000;
    await savePlanForUser(userId, "pro", exp, "coins");
    return { ok: true, balance: bal as number, planCookie: { value: signPlan("pro", exp), expires: new Date(exp) } };
  }
  await db.from("coin_unlocks").insert({ user_id: userId, kind: id, ref: item.perRef ? ref : "", remaining: item.uses ?? 1 });
  return { ok: true, balance: bal as number };
}

export function setPlanCookie(res: NextResponse, c: { value: string; expires: Date }) {
  res.cookies.set(PLAN_COOKIE, c.value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: c.expires });
}

/** Награда за пройденный мок (не больше REPEAT.mockPerDay в день). */
export async function awardMock(req: Request, attemptId: string) {
  const db = supabaseAdmin();
  const user = db ? await getUser(req) : null;
  if (!db || !user) return;
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("coin_ledger").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("reason", "mock").gte("created_at", since);
  if ((count ?? 0) >= REPEAT.mockPerDay) return;
  await award(db, user.id, REPEAT.mock, "mock", attemptId);
}

export async function awardLesson(req: Request, lessonId: string) {
  const db = supabaseAdmin();
  const user = db ? await getUser(req) : null;
  if (db && user) await award(db, user.id, REPEAT.lesson, "lesson", lessonId);
}

/** Приглашение: друг вошёл и прошёл оценку → монеты обоим (один раз, лимит приглашений в месяц). */
export async function applyReferral(db: SupabaseClient, userId: string, code: string): Promise<boolean> {
  if (!/^[a-z0-9]{6,12}$/.test(code)) return false;
  const [{ data: inviter }, { data: me }] = await Promise.all([
    db.from("user_state").select("user_id").eq("ref_code", code).maybeSingle(),
    db.from("user_state").select("referred_by,data").eq("user_id", userId).maybeSingle(),
  ]);
  if (!inviter || inviter.user_id === userId || me?.referred_by) return false;
  if (!(me?.data as { profile?: unknown } | null)?.profile) return false;
  const { data: u } = await db.auth.admin.getUserById(userId);
  // Приглашение засчитывается только новым аккаунтам (до 14 дней).
  if (!u.user || Date.now() - new Date(u.user.created_at).getTime() > 14 * 86400_000) return false;
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { count } = await db.from("coin_ledger").select("id", { count: "exact", head: true }).eq("user_id", inviter.user_id).eq("reason", "invite").gte("created_at", monthAgo);
  await db.from("user_state").update({ referred_by: inviter.user_id }).eq("user_id", userId);
  await award(db, userId, REPEAT.invitee, "invited", inviter.user_id);
  if ((count ?? 0) < REPEAT.invitesPerMonth) await award(db, inviter.user_id, REPEAT.inviter, "invite", userId);
  return true;
}
