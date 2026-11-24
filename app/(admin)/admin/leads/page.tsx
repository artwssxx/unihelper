"use client";

import { useEffect, useState } from "react";

type Lead = { id: string; program_id: string; full_name: string; phone: string; status: string; created_at: string };

export default function AdminLeads() {
  const [s, setS] = useState<{ leads: Lead[] | null } | null>(null);
  useEffect(() => { fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()).then(setS); }, []);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Лиды вузов</h1>
        <p className="mt-1 text-sm text-body">Заявки «Хочу консультацию» в частные вузы. Контакт уходит вузу только по кнопке ученика и с его согласием.</p>
      </div>
      {!s ? <p className="text-muted">Загрузка…</p> : s.leads === null ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">
          База не подключена: сейчас лиды приходят только сообщением в Telegram-чат команды (если задан бот). Подключите Supabase — здесь появится список со статусами.
        </p>
      ) : s.leads.length === 0 ? <p className="text-muted">Лидов пока нет.</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted"><tr><th className="px-5 py-3">Дата</th><th className="px-5 py-3">Ученик</th><th className="px-5 py-3">Телефон</th><th className="px-5 py-3">Вуз</th><th className="px-5 py-3">Статус</th></tr></thead>
            <tbody>
              {s.leads.map((l) => (
                <tr key={l.id} className="border-t border-line-3">
                  <td className="px-5 py-3">{new Date(l.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-5 py-3 font-bold">{l.full_name}</td>
                  <td className="px-5 py-3">{l.phone}</td>
                  <td className="px-5 py-3">{l.program_id}</td>
                  <td className="px-5 py-3">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
