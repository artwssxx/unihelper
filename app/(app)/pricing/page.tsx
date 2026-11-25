"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, usePlan } from "@/lib/auth";
import { FEATURE_ROWS } from "@/lib/plans";

export default function PricingPage() {
  const { plan, isPro, planExpiresAt, testProAllowed, setPlan } = usePlan();
  const { user, earlyAccessUntil, refreshPlan } = useAuth();
  useEffect(() => { void refreshPlan(); }, [refreshPlan]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(a: "activate-test" | "cancel") {
    setBusy(true);
    setMsg(null);
    const ok = await setPlan(a);
    if (ok && a === "activate-test") track("pro_test_activate");
    setBusy(false);
    setMsg(ok ? (a === "activate-test" ? "Бесплатный Pro включён на 30 дней." : "Вы вернулись на Free.") : "Не получилось, попробуйте ещё раз.");
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ТАРИФЫ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[44px]">
          Free и <span className="serif-accent text-primary">Pro</span>
        </h1>
        <p className="mt-2 max-w-[680px] text-body">Сейчас у вас: <b>{plan === "pro" ? "Pro" : "Free"}</b>{isPro && planExpiresAt ? ` до ${new Date(planExpiresAt).toLocaleDateString("ru-RU")}` : ""}.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card flex flex-col gap-3">
          <div className="font-extrabold">Free</div>
          <div className="text-[32px] font-extrabold">0 сум</div>
          <p className="text-sm text-body">Чтобы понять свои шансы и начать готовиться.</p>
        </div>
        <div className="inv-card flex flex-col gap-3 rounded-[24px] p-6">
          <div className="flex items-center justify-between"><span className="font-extrabold">Pro</span><span className="rounded-full bg-orange px-2.5 py-1 text-xs font-extrabold text-white">популярный</span></div>
          <div className="text-[32px] font-extrabold">120 000 сум <span className="text-base font-semibold text-navy-text">/ мес</span></div>
          <p className="text-sm text-navy-text">Сезон — 550 000 сум за 6 месяцев.</p>
          {testProAllowed && (
            <div className="mt-2 rounded-2xl bg-navy-2 p-4">
              <p className="text-sm text-navy-text">
                <b className="text-white">В честь открытия:</b> Pro можно получить бесплатно на 30 дней{user ? " — он сохранится в аккаунте" : ". Войдите, чтобы Pro сохранился на всех устройствах"}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {earlyAccessUntil ? null : isPro ? (
                  <button className="rounded-xl border border-navy-line px-4 py-2.5 text-sm font-bold" disabled={busy} onClick={() => act("cancel")}>Вернуться на Free</button>
                ) : (
                  <button className="btn-primary" disabled={busy} onClick={() => act("activate-test")}>{busy ? "Включаем…" : "Получить бесплатно"}</button>
                )}
                {!user && <Link href="/login?next=/pricing" className="rounded-xl border border-navy-line px-4 py-2.5 text-sm font-bold">Войти</Link>}
              </div>
            </div>
          )}
          <div className="mt-2 rounded-2xl bg-navy-2 p-4">
            <p className="text-sm text-navy-text"><b className="text-white">В честь открытия</b> — Pro на 2 месяца за 30 000 сум с ранним доступом к новым функциям.</p>
            {earlyAccessUntil ? (
              <p className="mt-3 text-sm font-bold">Ранний доступ до {new Date(earlyAccessUntil).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}</p>
            ) : (
              <Link className="btn-primary mt-3 inline-flex" href="/pricing/buy">Купить за 30 000 сум</Link>
            )}
          </div>
        </div>
      </div>
      {msg && <p className="rounded-2xl bg-green-soft px-5 py-3 text-sm font-semibold text-green">{msg}</p>}

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[620px] text-left text-[15px]">
          <thead className="text-sm text-muted">
            <tr><th className="px-6 py-4 font-semibold">Возможность</th><th className="px-6 py-4 font-semibold">Free</th><th className="px-6 py-4 font-semibold text-primary-ink">Pro</th></tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((r) => (
              <tr key={r.label} className="border-t border-line-3">
                <td className="px-6 py-3.5 font-semibold">{r.label}</td>
                <td className="px-6 py-3.5 text-body">{r.free}</td>
                <td className="px-6 py-3.5 font-bold">{r.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">Для школ — от 30 000 сум за ученика в месяц: кабинет консультанта и классные пробники. Пишите через раздел «Демо».</p>
    </div>
  );
}
