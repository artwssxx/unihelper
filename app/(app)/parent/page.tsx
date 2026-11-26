"use client";

import { useCallback, useEffect, useState } from "react";
import ChildForm from "@/components/family/ChildForm";
import * as I from "@/components/icons";
import { apiFetch } from "@/lib/auth";
import { update, useStore } from "@/lib/clientStore";
import type { ChildSummary } from "@/lib/family";
import type { Profile } from "@/lib/types";

// Кабинет родителя: дети и их прогресс. Данные ребёнка видны только после его согласия
// (код из профиля ребёнка или принятое приглашение). Анкета родителю не нужна.

export default function ParentPage() {
  const store = useStore();
  const [items, setItems] = useState<ChildSummary[] | null>(null);
  const [mode, setMode] = useState<"code" | "new" | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [invite, setInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/api/family/children").catch(() => null);
    setItems(r?.ok ? ((await r.json()).items as ChildSummary[]) : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // Без своей анкеты аккаунт считаем родительским: дальше кабинет открывается здесь, без анкеты ученика.
  useEffect(() => {
    if (store && !store.profile && store.role !== "parent") update(() => ({ role: "parent" }));
  }, [store]);

  async function add(body: object) {
    setBusy(true);
    setMsg(null);
    const r = await apiFetch("/api/family/children", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg({ ok: false, text: j.message ?? "Не получилось. Попробуйте ещё раз." });
    setMode(null);
    setCode("");
    if (j.inviteUrl) setInvite(j.inviteUrl);
    setMsg({ ok: true, text: j.inviteUrl ? "Ребёнок зарегистрирован. Отправьте ему ссылку — после входа вы увидите его прогресс." : "Ребёнок добавлен — его прогресс ниже." });
    load();
  }
  async function remove(c: ChildSummary) {
    if (!confirm(`Убрать «${c.name}» из кабинета родителя?`)) return;
    await apiFetch(`/api/family/children?id=${c.linkId}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ДЛЯ РОДИТЕЛЕЙ</div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]" data-i18n-phrase>Прогресс <span className="serif-accent text-primary">вашего ребёнка</span></h1>
        <p className="mt-2 max-w-[720px] text-body">
          Сила профиля, моки, план поступления, уроки и подобранные вузы — в одном месте. Ребёнок сам решает, кого подключить: он даёт код или принимает приглашение и может отключить родителя в любой момент. Переписку и тексты эссе родитель не видит.
        </p>
      </section>

      {msg && <p className={`rounded-2xl px-5 py-3 text-sm font-semibold ${msg.ok ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`}>{msg.text}</p>}
      {invite && <InviteBox url={invite} />}

      {mode === null ? (
        <section className="grid gap-4 md:grid-cols-2">
          <button className="card text-left transition-colors hover:border-primary" onClick={() => setMode("code")}>
            <I.Users size={24} className="text-primary" />
            <div className="mt-2 text-lg font-extrabold">У ребёнка уже есть аккаунт</div>
            <p className="mt-1 text-sm text-body">Попросите его открыть «Профиль» → «Родители» и продиктовать код из 6 символов.</p>
          </button>
          <button className="card text-left transition-colors hover:border-primary" onClick={() => setMode("new")}>
            <I.User size={24} className="text-primary" />
            <div className="mt-2 text-lg font-extrabold">Зарегистрировать ребёнка</div>
            <p className="mt-1 text-sm text-body">Заполните короткую анкету за ребёнка — сразу увидите силу профиля и подходящие вузы, а ребёнок получит ссылку для входа.</p>
          </button>
        </section>
      ) : (
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-xl font-extrabold">{mode === "code" ? "Добавить по коду ребёнка" : "Регистрация ребёнка"}</h2>
            <button className="text-sm font-bold text-muted" onClick={() => setMode(null)}>Отмена</button>
          </div>
          {mode === "code" ? (
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add({ mode: "code", code }); }}>
              <input className="input min-w-0 flex-1 text-center font-mono text-xl uppercase tracking-[0.3em]" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" aria-label="Код ребёнка" autoCapitalize="characters" />
              <button className="btn-primary" disabled={busy || code.trim().length < 6}>{busy ? "Проверяем…" : "Добавить"}</button>
            </form>
          ) : (
            <ChildForm busy={busy} onSubmit={(name, profile: Profile) => add({ mode: "new", name, profile })} />
          )}
        </section>
      )}

      {items === null ? (
        <div className="h-48 animate-pulse rounded-[24px] bg-line-3" role="status" aria-label="Загружаем" />
      ) : items.length === 0 ? (
        <p className="card text-center text-body">Детей пока нет — добавьте ребёнка одним из способов выше.</p>
      ) : (
        <div className="space-y-5">
          {items.map((c) => <ChildCard key={c.linkId} c={c} onRemove={() => remove(c)} />)}
        </div>
      )}
    </div>
  );
}

function InviteBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-3">
      <input className="input min-w-0 flex-1 font-mono text-sm" readOnly value={url} aria-label="Ссылка-приглашение для ребёнка" onFocus={(e) => e.currentTarget.select()} translate="no" />
      <button className="btn-secondary" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})}>{copied ? "Скопировано" : "Скопировать"}</button>
      <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("Я зарегистрировал(а) тебя в UniHelper — открой ссылку и войди, чтобы видеть свой план поступления")}`}>Отправить в Telegram</a>
    </div>
  );
}

function ChildCard({ c, onRemove }: { c: ChildSummary; onRemove: () => void }) {
  const pct = c.roadmap && c.roadmap.total ? Math.round((c.roadmap.done / c.roadmap.total) * 100) : 0;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const month = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { month: "long" }); // срок шага — месяц
  return (
    <article className="card space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-2xl font-extrabold" translate="no">{c.name}</h2>
          <p className="mt-1 text-sm text-muted">{[c.grade, c.city, c.majors].filter(Boolean).join(" · ") || "Анкета ещё не заполнена"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${c.status === "active" ? "bg-green-soft text-green" : "bg-orange-soft text-orange-ink-2"}`}>{c.status === "active" ? "подключён" : "ждём ребёнка"}</span>
          {c.lastActive && <span className="pill bg-line-3 text-muted">был(а) {fmt(c.lastActive)}</span>}
          <button className="text-xs font-bold text-muted hover:text-red" onClick={onRemove}>убрать</button>
        </div>
      </header>

      {c.status === "pending" && (
        <div className="space-y-2">
          <p className="text-sm text-body">Ребёнок ещё не открыл приглашение. Пока показываем оценку по анкете, которую вы заполнили. Отправьте ему ссылку:</p>
          {c.inviteUrl && <InviteBox url={c.inviteUrl} />}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Сила профиля" value={c.strength ? `${c.strength.score}` : "—"} sub={c.strength ? `из 100 · ${c.strength.level} · не шанс поступления` : "после анкеты"}>
          {c.strengthHistory.length > 1 && (
            <div className="mt-2 flex h-10 items-end gap-1" aria-label="Динамика силы профиля">
              {c.strengthHistory.map((h, i) => <span key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max(8, h.score)}%` }} title={`${h.score} — ${fmt(h.at)}`} />)}
            </div>
          )}
        </Stat>
        <Stat title="Дорожная карта" value={c.roadmap ? `${c.roadmap.done} / ${c.roadmap.total}` : "—"} sub={c.roadmap ? (c.roadmap.overdue ? `просрочено: ${c.roadmap.overdue}` : "без просрочек") : ""}>
          {c.roadmap && <div className="mt-2 h-2 overflow-hidden rounded-full bg-line-3"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>}
        </Stat>
        <Stat title="Оценки в школе" value={c.grades ? c.grades.average : "—"} sub={c.grades ? `${c.grades.core100 != null ? `профильные ${c.grades.core100} из 100` : "профильных нет"}${c.grades.weak.length ? ` · подтянуть: ${c.grades.weak.join(", ")}` : ""}` : "ребёнок ещё не загрузил оценки"} />
        <Stat title="Активность" value={c.coins ? `уровень ${c.coins.level}` : "—"} sub={c.coins ? `${c.coins.title} · серия ${c.coins.streak} · уроков: ${c.lessons}` : `уроков: ${c.lessons}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-xs font-extrabold tracking-[0.14em] text-muted">БЛИЖАЙШИЕ ШАГИ</h3>
          {c.roadmap?.next.length ? (
            <ul className="space-y-1.5 text-sm">
              {c.roadmap.next.map((s, i) => <li key={i} className="flex justify-between gap-3 rounded-xl border border-line px-3 py-2"><span>{s.title}</span><span className="flex-none text-muted">{month(s.due)}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">Нет данных.</p>}
        </section>
        <section>
          <h3 className="mb-2 text-xs font-extrabold tracking-[0.14em] text-muted">МОКИ</h3>
          {c.mocks.length ? (
            <ul className="space-y-1.5 text-sm">
              {c.mocks.map((m, i) => <li key={i} className="flex justify-between gap-3 rounded-xl border border-line px-3 py-2"><span>{m.label}{m.hard ? " · хард" : ""}</span><span className="flex-none font-bold">{m.result} <span className="font-normal text-muted">· {fmt(m.at)}</span></span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">Моков пока не было.</p>}
          <p className="mt-1.5 text-xs text-muted">Балл мока — примерная оценка диапазоном, не официальный результат.</p>
        </section>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-extrabold tracking-[0.14em] text-muted">{c.programsMine ? "ВУЗЫ В СПИСКЕ" : "ПОДХОДЯЩИЕ ВУЗЫ"}</h3>
        {c.programs.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {c.programs.map((p, i) => (
              <div key={i} className="rounded-xl border border-line p-3 text-sm">
                <div className="font-extrabold" translate="no">{p.university}</div>
                <div className="text-xs text-muted" translate="no">{p.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="pill bg-primary-soft text-primary-ink">Поступление: {p.admission}</span>
                  <span className="pill bg-orange-soft text-orange-ink-2">Финансирование: {p.funding}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">Нет данных.</p>}
      </section>
    </article>
  );
}

function Stat({ title, value, sub, children }: { title: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="text-xs font-extrabold tracking-[0.14em] text-muted">{title.toUpperCase()}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
      {children}
    </div>
  );
}
