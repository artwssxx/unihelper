"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as I from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Обзор", icon: I.Home },
  { href: "/admin/payments", label: "Оплаты Pro", icon: I.ListIcon },
  { href: "/admin/programs", label: "Программы и гранты", icon: I.ListIcon },
  { href: "/admin/suggestions", label: "Предложения вузов", icon: I.Globe },
  { href: "/admin/events", label: "Ивенты", icon: I.Calendar },
  { href: "/admin/lessons", label: "Уроки", icon: I.Play },
  { href: "/admin/blog", label: "Блог", icon: I.Pen },
  { href: "/admin/questions", label: "Банк вопросов", icon: I.Timer },
  { href: "/admin/reading", label: "Тесты IELTS Reading", icon: I.Pen },
  { href: "/admin/leads", label: "Лиды вузов", icon: I.User },
  { href: "/admin/community", label: "Комьюнити", icon: I.Users },
  { href: "/admin/telegram", label: "Telegram-бот", icon: I.Send },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="glass rounded-none border-y-0 border-l-0 p-4 shadow-none lg:sticky lg:top-0 lg:h-screen lg:w-[250px] lg:flex-none">
        <div className="flex items-center justify-between gap-2 px-2 pb-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <I.Logo />
            <div>
              <div className="font-extrabold">UniHelper</div>
              <div className="text-xs text-muted">Админка</div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Разделы админки">
          {NAV.map((n) => {
            const on = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={`flex flex-none items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold ${on ? "bg-primary-soft text-primary-ink" : "text-ink-2 hover:bg-primary-soft"}`}>
                <Icon size={18} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex flex-wrap gap-2 px-2 lg:mt-8 lg:flex-col">
          <Link href="/" className="text-sm font-bold text-primary">← На сайт</Link>
          <button className="text-left text-sm font-bold text-muted" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); location.reload(); }}>Выйти</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
