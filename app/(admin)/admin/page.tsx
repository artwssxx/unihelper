"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  storage: "supabase" | "file" | "readonly"; ai: string | null; database: boolean;
  content: Record<"programs" | "events" | "lessons", { total: number; edited: number }>;
  unverifiedPrograms: number;
  stalePrograms: number;
  pendingSuggestions: number | null;
  bank: Record<"math" | "rw" | "reading", { total: number; d1: number; d2: number; d3: number }>;
  leads: unknown[] | null; mockAttempts: number | null;
};

export default function AdminHome() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then(setS); }, []);
  if (!s) return <p className="text-muted">Загрузка…</p>;
  const sections = [
    { href: "/admin/programs", t: "Программы и гранты", n: s.content.programs },
    { href: "/admin/events", t: "Ивенты", n: s.content.events },
    { href: "/admin/lessons", t: "Уроки", n: s.content.lessons },
  ];
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">АДМИНКА</div>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-tight">Обзор</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Status label="ИИ" ok={Boolean(s.ai)} text={s.ai ? `подключён: ${s.ai}` : "не подключён (нет ключа)"} />
        <Status label="База данных" ok={s.database} text={s.database ? "Supabase подключена" : "не подключена — данные учеников в браузере"} />
        <Status label="Сохранение правок" ok={s.storage !== "readonly"} text={s.storage === "supabase" ? "в Supabase" : s.storage === "file" ? "в локальный файл" : "только чтение — нужна база"} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((x) => (
          <Link key={x.href} href={x.href} className="card lift block">
            <div className="text-sm font-bold text-muted">{x.t}</div>
            <div className="mt-2 text-[36px] font-extrabold">{x.n.total}</div>
            <div className="text-sm text-body">{x.n.edited ? `изменено в админке: ${x.n.edited}` : "все из кода"}</div>
          </Link>
        ))}
      </div>
      {(s.pendingSuggestions ?? 0) > 0 && (
        <Link href="/admin/suggestions" className="block rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-primary-ink">
          Ждут проверки предложенные учениками вузы: {s.pendingSuggestions} →
        </Link>
      )}
      {s.stalePrograms > 0 && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">Данные устарели (проверены более 6 месяцев назад): {s.stalePrograms} программ — обновите.</p>
      )}
      {s.unverifiedPrograms > 0 && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">
          Не проверено экспертом: {s.unverifiedPrograms} программ. Сверьте данные с официальными сайтами и заполните поле «Проверено экспертом» — плашка «ориентировочно» исчезнет.
        </p>
      )}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Банк вопросов</h2>
          <Link href="/admin/questions" className="text-sm font-bold text-primary">Открыть</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["math", "rw", "reading"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-line p-4">
              <div className="text-sm font-bold text-muted">{k === "math" ? "SAT Math" : k === "rw" ? "SAT Reading & Writing" : "IELTS Reading"}</div>
              <div className="mt-1 text-2xl font-extrabold">{s.bank[k].total}</div>
              <div className="text-xs text-muted">лёгких {s.bank[k].d1} · средних {s.bank[k].d2} · сложных {s.bank[k].d3}</div>
            </div>
          ))}
        </div>
        {s.mockAttempts != null && <p className="mt-3 text-sm text-body">Попыток моков в базе: {s.mockAttempts}</p>}
      </div>
    </div>
  );
}

function Status({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="card flex items-start gap-3">
      <span className={`mt-1 h-3 w-3 flex-none rounded-full ${ok ? "bg-green" : "bg-orange"}`} aria-hidden />
      <div>
        <div className="font-extrabold">{label}</div>
        <div className="text-sm text-body">{text}</div>
      </div>
    </div>
  );
}
