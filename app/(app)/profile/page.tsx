"use client";

import { track } from "@/lib/analytics";
import ParentsCard from "@/components/family/ParentsCard";
import GradesCard from "@/components/grades/GradesCard";
import NumberInput from "@/components/NumberInput";
import CertificateUpload from "@/components/quiz/CertificateUpload";
import { gradesGpa100 } from "@/lib/grades";
import MajorPicker from "@/components/MajorPicker";
import { useCallback, useEffect, useState } from "react";
import NeedProfile from "@/components/NeedProfile";
import StrengthCard from "@/components/StrengthCard";
import { reset, update } from "@/lib/clientStore";
import { profileSchema } from "@/lib/profileSchema";
import CountryPicker from "@/components/CountryPicker";
import { scoreProfile } from "@/lib/scoring/strength";
import type { Profile } from "@/lib/types";
import { useProfile } from "@/lib/useProfile";
import Link from "next/link";
import { apiFetch, useAuth, usePlan } from "@/lib/auth";

const LEVELS = [
  { v: "none", label: "Пока нет" }, { v: "school", label: "Школа" }, { v: "city", label: "Город / область" },
  { v: "national", label: "Республика" }, { v: "international", label: "Международный" },
] as const;

export default function ProfilePage() {
  const { profile, store } = useProfile();
  const [draft, setDraft] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  if (profile === undefined) return null;
  if (profile === null) return (<div className="space-y-5"><NeedProfile /><AccountCard /><TelegramCard /></div>);
  const p = draft ?? store!.profile!;
  const s = scoreProfile(profile);
  const set = (patch: Partial<Profile>) => { setDraft({ ...p, ...patch }); setSaved(false); };
  const valid = profileSchema.safeParse(p).success;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap gap-6">
        <div className="min-w-0 flex-[1_1_300px] pt-2">
          <div className="eyebrow">ПРОФИЛЬ</div>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">{store?.contact?.fullName ?? "Мой профиль"}</h1>
          <p className="mt-2 text-body">Изменения пересчитывают Profile Strength, подборку программ и дорожную карту.</p>
          <ol className="mt-5 space-y-2.5">
            {s.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-ink">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ol>
        </div>
        <StrengthCard s={s} cta={false} className="flex-[1.4_1_460px]" />
      </section>

      <section className="card space-y-5">
        <h2 className="m-0 text-xl font-extrabold">Данные анкеты</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Класс / курс">
            <select className="input" value={p.grade} onChange={(e) => set({ grade: Number(e.target.value) })}>
              {[8, 9, 10, 11, 12, 13].map((g) => <option key={g} value={g}>{g <= 11 ? `${g} класс` : `${g - 11} курс`}</option>)}
            </select>
          </Field>
          <Field label="Город"><input className="input" value={p.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label={`GPA (шкала ${p.gpaScale === 5 ? "1–5" : "0–100"})`}>
            <NumberInput aria-label="GPA" value={p.gpa} onChange={(v) => set({ gpa: v })} />
            {gradesGpa100(store?.profile?.grades) != null && <span className="mt-1 block text-xs font-normal text-muted">Сейчас GPA считается по оценкам предметов (ниже).</span>}
          </Field>
          <Field label="Шкала GPA">
            <select className="input" value={p.gpaScale} onChange={(e) => set({ gpaScale: Number(e.target.value) as 5 | 100, gpa: null })}>
              <option value={5}>1–5</option><option value={100}>0–100</option>
            </select>
          </Field>
          <Field label="IELTS (официальный)">
            <NumberInput aria-label="IELTS" value={p.ielts} placeholder="не сдавал" onChange={(v) => set({ ielts: v })} />
            {p.testProof?.ielts && <Proof official={p.testProof.ielts.official} date={p.testProof.ielts.date} />}
          </Field>
          <Field label="SAT (официальный)">
            <NumberInput aria-label="SAT" decimals={false} value={p.sat} placeholder="не сдавал" onChange={(v) => set({ sat: v })} />
            {p.testProof?.sat && <Proof official={p.testProof.sat.official} date={p.testProof.sat.date} />}
          </Field>
          <Field label="Бюджет семьи в год, $"><NumberInput decimals={false} value={p.budgetUsd} onChange={(v) => set({ budgetUsd: v ?? 0 })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CertificateUpload exam="ielts" onScore={(v, official, date) => set({ ielts: v, testProof: { ...p.testProof, ielts: { official, date } } })} />
          <CertificateUpload exam="sat" onScore={(v, official, date) => set({ sat: v, testProof: { ...p.testProof, sat: { official, date } } })} />
        </div>
        <Field label="Направления">
          <MajorPicker value={p} onChange={(v) => set(v)} />
        </Field>
        <Field label="Достижения и активности">
          <textarea className="input min-h-24" value={p.achievementsText} onChange={(e) => set({ achievementsText: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Высший уровень достижения">
            <select className="input" value={p.bestAchievementLevel} onChange={(e) => set({ bestAchievementLevel: e.target.value as Profile["bestAchievementLevel"] })}>
              {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="Число активностей"><NumberInput decimals={false} value={p.activitiesCount} onChange={(v) => set({ activitiesCount: Math.max(0, Math.min(30, v ?? 0)) })} /></Field>
          <Field label="Рекомендации">
            <select className="input" value={p.recommendations} onChange={(e) => set({ recommendations: e.target.value as Profile["recommendations"] })}>
              <option value="not_assessed">Не оценено</option>
              <option value="weak">Пока некого попросить</option>
              <option value="ok">Есть 1 учитель</option>
              <option value="strong">Есть 2+ учителя, хорошо знают меня</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={p.ledSomething} onChange={(e) => set({ ledSomething: e.target.checked })} />
          Я сам(а) запустил(а) или вёл(а) проект, клуб или команду
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Страны</legend>
          <div className="mt-2"><CountryPicker value={p.targetCountries} onChange={(v) => set({ targetCountries: v })} /></div>
        </fieldset>
        <p className="text-xs text-muted">Эссе оценивается в разделе «Эссе». Баллы моков учитываются в силе профиля автоматически («по моку») и не заменяют официальные.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={!draft || !valid} onClick={() => { update((st) => ({ profile: { ...p, grades: st.profile?.grades } })); setDraft(null); setSaved(true); }}>Сохранить</button>
          {saved && <span className="text-sm font-bold text-green">Сохранено</span>}
          {!valid && <span className="text-sm text-red">Проверьте поля</span>}
        </div>
      </section>

      <GradesCard />
      <AccountCard />
      <TelegramCard />
      <ParentsCard />

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-extrabold">Данные на этом устройстве</h2>
          <p className="mt-1 text-sm text-body">Пока нет входа, профиль, история моков и прогресс хранятся в этом браузере.</p>
        </div>
        <button className="btn-secondary text-red" onClick={() => { if (confirm("Удалить все данные Unihelper с этого устройства?")) { reset(); location.href = "/"; } }}>Удалить данные</button>
      </section>
    </div>
  );
}

function Proof({ official, date }: { official: boolean; date: string | null }) {
  return (
    <span className={`mt-1 block text-xs font-semibold ${official ? "text-green" : "text-orange-ink-2"}`}>
      {official ? "подтверждено сертификатом" : "сертификат с замечаниями"}{date ? ` · ${new Date(date).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}` : ""}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-ink-2">{label}<div className="mt-1.5">{children}</div></label>;
}

function AccountCard() {
  const { user, ready, signOut, enabled } = useAuth();
  const { isPro, planExpiresAt } = usePlan();
  if (!ready || !enabled) return null;
  const via = user?.provider === "telegram" ? "Telegram" : user?.provider === "google" ? "Google" : "почта";
  return (
    <section className="card flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold">Аккаунт</h2>
        {user ? (
          <p className="mt-1 text-sm text-body">
            Вы вошли через {via}{user.email ? ` (${user.email})` : ""}. Профиль, моки и прогресс синхронизируются между устройствами.
            {" "}Тариф: <b>{isPro ? `Pro${planExpiresAt ? ` до ${new Date(planExpiresAt).toLocaleDateString("ru-RU")}` : ""}` : "Free"}</b>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-body">Войдите, чтобы не потерять профиль и историю моков и открыть их на телефоне и в Telegram.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Link href="/pricing" className="btn-secondary">Тарифы</Link>
        {user ? (
          <button className="btn-secondary" onClick={signOut}>Выйти</button>
        ) : (
          <Link href="/login?next=/profile" className="btn-primary">Войти</Link>
        )}
      </div>
    </section>
  );
}

function TelegramCard() {
  const { user } = useAuth();
  const [st, setSt] = useState<{ available: boolean; bot: string | null; linked: boolean; username: string | null; notify: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await apiFetch("/api/telegram/link").catch(() => null);
    if (r?.ok) setSt(await r.json());
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  // Вернулись из Telegram после привязки — обновляем статус.
  useEffect(() => {
    const f = () => document.visibilityState === "visible" && user && load();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [user, load]);
  if (!user || !st?.available) return null;

  async function connect() {
    setBusy(true);
    setErr(null);
    const r = await apiFetch("/api/telegram/link", { method: "POST" }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !j.url) return setErr(j.message ?? "Не удалось получить ссылку.");
    track("telegram_link_start");
    window.open(j.url, "_blank", "noopener,noreferrer");
  }
  async function toggle(notify: boolean) {
    setSt((x) => (x ? { ...x, notify } : x));
    await apiFetch("/api/telegram/link", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notify }) }).catch(() => null);
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-extrabold">Telegram</h2>
          <p className="mt-1 text-sm text-body" data-i18n-phrase>
            {st.linked ? (
              <>Бот <b translate="no">@{st.bot}</b> подключён{st.username ? <> к <b translate="no">@{st.username}</b></> : null}: план на неделю, новые сообщения из комьюнити и ответы AI Advisor прямо в Telegram.</>
            ) : (
              <>Подключи бота <b translate="no">@{st.bot}</b>: раз в неделю — план и ивенты, сразу — новые сообщения из комьюнити. UniHelper можно открыть прямо в Telegram.</>
            )}
          </p>
        </div>
        {!st.linked && <button className="btn-primary" disabled={busy} onClick={connect}>{busy ? "Готовим ссылку…" : "Подключить Telegram"}</button>}
      </div>
      {st.linked && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={st.notify} onChange={(e) => toggle(e.target.checked)} />
          Присылать напоминания и уведомления
        </label>
      )}
      {!st.linked && <p className="text-xs text-muted">Откроется Telegram — нажми «Старт», и аккаунт подключится. Ссылка действует час.</p>}
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
    </section>
  );
}
