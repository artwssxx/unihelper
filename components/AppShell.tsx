"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth, usePlan } from "@/lib/auth";
import { useStore } from "@/lib/clientStore";
import AuthGate from "./auth/AuthGate";
import CoinPill from "./coins/CoinPill";
import DemoTour from "./DemoTour";
import ThemeToggle from "./ThemeToggle";
import * as I from "./icons";

const MAIN = [
  { href: "/dashboard", label: "Главная", icon: I.Home },
  { href: "/programs", label: "Подбор вузов", icon: I.ListIcon },
  { href: "/roadmap", label: "Дорожная карта", icon: I.MapIcon },
  { href: "/mocks", label: "Моки SAT / IELTS", icon: I.Timer },
  { href: "/events", label: "Ивенты", icon: I.Calendar },
  { href: "/lessons", label: "Уроки", icon: I.Play },
  { href: "/community", label: "Комьюнити", icon: I.Users },
];
const TOOLS = [
  { href: "/assistant", label: "AI Advisor", icon: I.Spark },
  { href: "/essays", label: "Эссе", icon: I.Pen },
  { href: "/portfolio", label: "Сайт-портфолио", icon: I.Globe },
  { href: "/coins", label: "UniCoins", icon: I.Coin },
  { href: "/profile", label: "Профиль", icon: I.User },
  { href: "/pricing", label: "Тарифы", icon: I.Card },
];
const ALL = [...MAIN, ...TOOLS];

export function initials(name?: string): string {
  if (!name) return "UH";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const store = useStore();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const current = ALL.find((n) => path === n.href || path.startsWith(n.href + "/"));

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Разделы">
      <div className="lbl px-[14px] py-1.5">ГЛАВНОЕ</div>
      {MAIN.map((n) => (
        <NavLink key={n.href} {...n} on={current?.href === n.href} onClick={() => setOpen(false)} />
      ))}
      <div className="lbl px-[14px] pb-1.5 pt-[18px]">ИНСТРУМЕНТЫ</div>
      {TOOLS.map((n) => (
        <NavLink key={n.href} {...n} on={current?.href === n.href} onClick={() => setOpen(false)} />
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="glass sticky top-0 hidden h-screen w-[250px] flex-none overflow-y-auto rounded-none border-y-0 border-l-0 px-4 py-[22px] shadow-none lg:block">
        <Brand />
        {nav}
        <PlanCard />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-[rgba(10,14,28,.5)] lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-[280px] overflow-y-auto bg-surface-solid px-4 py-[22px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Brand />
            {nav}
            <PlanCard />
          </aside>
        </div>
      )}

      <main className={`min-w-0 flex-1 px-4 pb-12 pt-5 sm:px-8 sm:pt-6 ${store?.demo?.active && store.demo.tour ? "xl:pr-[400px]" : ""}`}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface lg:hidden"
              aria-label="Открыть меню"
              onClick={() => setOpen(true)}
            >
              <I.Menu />
            </button>
            <div>
              <div className="text-[13px] text-muted">UniHelper</div>
              <div className="text-[17px] font-extrabold">{current?.label ?? "UniHelper"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <CoinPill />
            <ThemeToggle />
            <Link
              href="/roadmap"
              aria-label="Уведомления и ближайшие шаги"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
            >
              <I.Bell />
            </Link>
            {ready && !user && (
              <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn-secondary px-4 py-2.5 text-sm">Войти</Link>
            )}
            <Link
              href="/profile"
              aria-label="Профиль"
              className="flex h-11 w-11 items-center justify-center rounded-full font-extrabold text-white"
              style={{ background: "var(--grad)" }}
            >
              {initials(user?.name ?? store?.contact?.fullName ?? user?.email ?? undefined)}
            </Link>
          </div>
        </header>
        {store?.demo?.active && (
          <p className="mt-4 rounded-xl bg-orange-soft px-4 py-2 text-[13px] font-semibold text-orange-ink-2">
            Демо-режим: ученик и его история вымышленные, мок-баллы посчитаны движком на смоделированных ответах. ИИ отвечает вживую.
          </p>
        )}
        <div className={store?.demo?.active ? "mt-6 pb-64 sm:pb-28 xl:pb-0" : "mt-6"}><AuthGate>{children}</AuthGate></div>
      </main>
      {store?.demo?.active && <DemoTour demo={store.demo} />}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2 pb-[22px]">
      <I.Logo />
      <div>
        <div className="text-[17px] font-extrabold">UniHelper</div>
        <div className="text-xs text-muted">Admissions workspace</div>
      </div>
    </Link>
  );
}

function NavLink(props: { href: string; label: string; icon: (p: { size?: number }) => React.ReactNode; on: boolean; onClick: () => void }) {
  const Icon = props.icon;
  return (
    <Link
      href={props.href}
      onClick={props.onClick}
      aria-current={props.on ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-[14px] py-[11px] text-[15px] font-semibold ${
        props.on ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:bg-primary-soft"
      }`}
    >
      <Icon size={18} />
      {props.label}
    </Link>
  );
}

function PlanCard() {
  const { isPro, planExpiresAt } = usePlan();
  return (
    <Link href="/pricing" className="mt-6 block rounded-2xl p-4" style={isPro ? { background: "var(--grad)", color: "#fff" } : { background: "var(--line-3)" }}>
      <div className="text-sm font-extrabold">{isPro ? "Pro" : "Тариф Free"}{isPro && planExpiresAt ? ` до ${new Date(planExpiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}` : ""}</div>
      <div className={`mt-1 text-[13px] leading-relaxed ${isPro ? "opacity-90" : "text-muted"}`}>
        {isPro ? "Хард-режим, все уроки, ИИ-проверки и шаблоны открыты." : "Лёгкий режим моков и базовая оценка. Хард-режим и все уроки — в Pro."}
      </div>
    </Link>
  );
}
