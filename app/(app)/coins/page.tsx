"use client";

import Link from "next/link";
import { useState } from "react";
import * as I from "@/components/icons";
import { Achievements, LevelCard, ProgressRewards, Quests } from "@/components/coins/GameBlocks";
import { apiFetch, useAuth } from "@/lib/auth";
import { REASON_RU, REPEAT, SHOP, SOCIALS, TASKS, type ShopItem, type TaskId } from "@/lib/coins";
import { useStore } from "@/lib/clientStore";
import { SITE_URL } from "@/lib/site";
import { refreshCoins, useCoins } from "@/lib/useCoins";

const MILESTONES = Object.keys(REPEAT.streakBonus).map(Number);
const FOLLOW_URL: Partial<Record<TaskId, string>> = {
  instagram: SOCIALS.instagram,
  tiktok: SOCIALS.tiktok,
  youtube: SOCIALS.youtube,
  telegram_channel: SOCIALS.telegramChannel ? `https://t.me/${SOCIALS.telegramChannel.replace(/^@/, "")}` : "",
};

export default function CoinsPage() {
  const { ready, user } = useAuth();
  const store = useStore();
  const { enabled, state, buy, claim } = useCoins();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());

  if (!ready) return null;
  if (!user || store?.demo?.active) return <Intro demo={Boolean(store?.demo?.active)} />;
  if (!enabled || !state) {
    return (
      <div className="space-y-5" role="status" aria-label="Загружаем кошелёк">
        <div className="h-[190px] animate-pulse rounded-[26px] bg-line-3" />
        <div className="grid gap-5 lg:grid-cols-2"><div className="h-28 animate-pulse rounded-[24px] bg-line-3" /><div className="h-28 animate-pulse rounded-[24px] bg-line-3" /></div>
        <div className="h-40 animate-pulse rounded-[24px] bg-line-3" />
      </div>
    );
  }

  const nextMilestone = MILESTONES.find((m) => m > state.streak);
  const link = `${SITE_URL}/r/${state.refCode}`;

  async function doClaim(id: TaskId) {
    setBusy(id);
    const r = await claim(id);
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: `+${r.awarded} UniCoins` } : { ok: false, text: r.message ?? "Не получилось." });
  }
  async function doBuy(item: ShopItem) {
    setBusy(item.id);
    const r = await buy(item.id);
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: r.pro ? `${item.title} включён. Обновите страницу, если Pro не появился сразу.` : `Открыто: ${item.title}.` } : { ok: false, text: r.message ?? "Не получилось." });
    if (r.pro) setTimeout(() => location.reload(), 1200);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] grad-card p-7 text-white">
        <div className="absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full bg-white/[.08]" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[13px] font-extrabold tracking-[0.14em] opacity-85">UNICOINS</div>
            <div className="mt-2 flex items-center gap-3">
              <I.Coin size={44} />
              <span className="text-[56px] font-extrabold leading-none tabular-nums">{state.balance}</span>
            </div>
            <p className="mt-3 max-w-[460px] text-sm opacity-90">Монеты за активность и помощь проекту. Тратятся на Pro и на действия сверх лимита Free.</p>
          </div>
          <div className="min-w-[260px] rounded-2xl bg-white/[.12] p-4">
            <div className="flex items-center gap-2 font-extrabold">
              <I.Flame size={20} /> Серия: {state.streak} {plural(state.streak, "день", "дня", "дней")}
            </div>
            <div className="mt-3 flex gap-1.5" aria-label="Последние 7 дней серии">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-full ${i < Math.min(7, state.streak) ? "bg-white" : "bg-white/25"}`} />
              ))}
            </div>
            <p className="mt-2 text-xs opacity-90">
              {state.checkedInToday ? `Сегодня +${REPEAT.checkinBase} получено.` : "Заходи каждый день: +5 за вход."}
              {nextMilestone ? ` До бонуса +${REPEAT.streakBonus[nextMilestone]} — ${nextMilestone - state.streak} ${plural(nextMilestone - state.streak, "день", "дня", "дней")}.` : ""}
            </p>
          </div>
        </div>
      </section>

      {msg && <p className={`rounded-2xl px-5 py-3 text-sm font-semibold ${msg.ok ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`}>{msg.text}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <LevelCard s={state} />
        <Quests s={state} />
      </div>
      <Achievements s={state} />
      <ProgressRewards />

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">Пригласи друга</h2>
          <span className="pill bg-primary-soft text-primary-ink">приглашено: {state.invited}</span>
        </div>
        <p className="text-sm text-body">
          Друг заходит по твоей ссылке, входит и проходит оценку профиля — тебе +{REPEAT.inviter}, ему +{REPEAT.invitee}. До {REPEAT.invitesPerMonth} друзей в месяц.
        </p>
        <div className="flex flex-wrap gap-2">
          <input className="input min-w-0 flex-1 font-mono text-sm" readOnly value={link} aria-label="Твоя ссылка-приглашение" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn-secondary" onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg({ ok: true, text: "Ссылка скопирована." }), () => {})}>Скопировать</button>
          <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Подбор вузов за рубежом с честной оценкой, моки SAT и IELTS и план поступления — UniHelper")}`}>
            Отправить в Telegram
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Заработать</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {state.tasks.filter((t) => t.kind !== "form").map((t) => {
            const url = FOLLOW_URL[t.id];
            return (
              <div key={t.id} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{t.title}</div>
                  <div className="text-xs text-muted">{t.hint}</div>
                </div>
                <span className="flex flex-none items-center gap-1 font-extrabold text-orange"><I.Coin size={16} />+{t.reward}</span>
                {t.status === "claimed" ? (
                  <span className="pill bg-green-soft text-green"><I.Check size={12} /> получено</span>
                ) : t.status === "ready" ? (
                  <button className="btn-primary px-3 py-2 text-sm" disabled={busy === t.id} onClick={() => doClaim(t.id)}>Забрать</button>
                ) : url ? (
                  opened.has(t.id) ? (
                    <button className="btn-primary px-3 py-2 text-sm" disabled={busy === t.id} onClick={() => doClaim(t.id)}>{t.id === "telegram_channel" ? "Проверить" : "Я подписался"}</button>
                  ) : (
                    <a className="btn-secondary px-3 py-2 text-sm" href={url} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setOpened((o) => new Set(o).add(t.id)), 1500)}>Открыть</a>
                  )
                ) : t.href ? (
                  <Link className="btn-secondary px-3 py-2 text-sm" href={t.href}>Выполнить</Link>
                ) : null}
              </div>
            );
          })}
          <div className="card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-extrabold">Пройти мок или урок</div>
              <div className="text-xs text-muted">+{REPEAT.mock} за мок (до {REPEAT.mockPerDay} в день), +{REPEAT.lesson} за каждый урок с тестом от 60%</div>
            </div>
            <Link className="btn-secondary px-3 py-2 text-sm" href="/mocks">Начать</Link>
          </div>
        </div>
        {state.tasks.some((t) => t.id === "feedback" && t.status !== "claimed") && <Feedback reward={TASKS.find((t) => t.id === "feedback")!.reward} onDone={(n) => setMsg({ ok: true, text: `Спасибо за отзыв! +${n} UniCoins` })} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Потратить</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SHOP.map((it) => {
            const credits = state.unlocks.credits[it.id] ?? 0;
            const owned = it.id === "portfolio_pro" ? state.unlocks.portfolioPro : false;
            return (
              <div key={it.id} className="card flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-extrabold">{it.title}</div>
                  <span className="flex flex-none items-center gap-1 font-extrabold text-orange"><I.Coin size={16} />{it.price}</span>
                </div>
                <p className="text-sm text-body">{it.hint}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted">{owned ? "открыто навсегда" : credits && !it.perRef && it.uses && it.uses < 1000 ? `есть: ${credits}` : ""}</span>
                  {it.perRef ? (
                    <Link href="/programs" className="btn-secondary px-3 py-2 text-sm">В подборе вузов</Link>
                  ) : owned ? (
                    <span className="pill bg-green-soft text-green">открыто</span>
                  ) : (
                    <button className="btn-primary px-3 py-2 text-sm" disabled={busy === it.id || state.balance < it.price} onClick={() => doBuy(it)}>
                      {state.balance < it.price ? `Нужно ещё ${it.price - state.balance}` : "Купить"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {state.history.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-lg font-extrabold">История</h2>
          <ul className="divide-y divide-line-3 text-sm">
            {state.history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span>{historyLabel(h.reason)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted">{new Date(h.at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
                  <b className={`tabular-nums ${h.delta > 0 ? "text-green" : "text-red"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</b>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function historyLabel(reason: string) {
  if (reason.startsWith("task:")) return `Задание: ${TASKS.find((t) => t.id === reason.slice(5))?.title ?? reason.slice(5)}`;
  if (reason.startsWith("spend:")) return `Покупка: ${SHOP.find((s) => s.id === reason.slice(6))?.title ?? reason.slice(6)}`;
  return REASON_RU[reason] ?? reason;
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}

function Feedback({ reward, onDone }: { reward: number; onDone: (n: number) => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function send() {
    setBusy(true);
    setErr(null);
    const r = await apiFetch("/api/coins/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating, text }) }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return setErr(j.message ?? "Не получилось отправить.");
    await refreshCoins();
    onDone(j.awarded ?? 0);
  }
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-extrabold">Отзыв о UniHelper</div>
        <span className="flex items-center gap-1 font-extrabold text-orange"><I.Coin size={16} />+{reward}</span>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} className="chip h-9 w-9 justify-center p-0 text-sm" data-on={rating >= n} onClick={() => setRating(n)}>{n}</button>
        ))}
      </div>
      <textarea className="input min-h-24" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Что нравится, что неудобно, чего не хватает" aria-label="Текст отзыва" />
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      <button className="btn-primary" disabled={busy || text.trim().length < 30} onClick={send}>{text.trim().length < 30 ? `Ещё ${30 - text.trim().length} символов` : "Отправить"}</button>
    </div>
  );
}

function Intro({ demo }: { demo: boolean }) {
  return (
    <div className="space-y-5">
      <section>
        <div className="eyebrow">UNICOINS</div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">Копи монеты — <span className="serif-accent text-primary">открывай Pro</span></h1>
        <p className="mt-2 max-w-[620px] text-body">Заходи каждый день, проходи моки и уроки, приглашай друзей и подписывайся на UniHelper. Монеты тратятся на Pro и на действия сверх лимита Free.</p>
      </section>
      {demo ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">В демо монеты не начисляются: ученик вымышленный.</p>
      ) : (
        <Link href="/login?next=/coins" className="btn-primary">Войти, чтобы копить UniCoins</Link>
      )}
    </div>
  );
}
