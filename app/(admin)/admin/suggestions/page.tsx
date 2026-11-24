"use client";

import { useCallback, useEffect, useState } from "react";
import AutoForm from "@/components/admin/AutoForm";
import { countryName } from "@/lib/countries";

type Row = { id: string; data: Record<string, unknown>; status: "pending" | "approved" | "rejected"; created_at: string; admin_note: string | null };

export default function AdminSuggestions() {
  const [items, setItems] = useState<Row[] | null | undefined>(undefined);
  const [open, setOpen] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/admin/suggestions", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items)), []);
  useEffect(() => { load(); }, [load]);

  async function act(action: "approve" | "reject") {
    if (!open) return;
    const r = await fetch("/api/admin/suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: open.id, action, data: draft ?? undefined }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.message ?? "Ошибка");
    setMsg(action === "approve" ? "Одобрено — вуз в общем каталоге." : "Отклонено.");
    setOpen(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Предложения вузов</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">Вузы, которые ученики добавили сами и отправили в каталог. Проверьте цифры по официальному сайту, поправьте, заполните «Проверено экспертом» и одобрите — вуз появится у всех.</p>
      </div>
      {msg && <p className="rounded-2xl bg-green-soft px-5 py-3 text-sm font-semibold text-green">{msg}</p>}
      {items === undefined ? <p className="text-muted">Загрузка…</p> : items === null ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">Нужна база данных (Supabase).</p>
      ) : items.length === 0 ? <p className="text-muted">Предложений пока нет.</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted"><tr><th className="px-5 py-3">Вуз</th><th className="px-5 py-3">Страна</th><th className="px-5 py-3">Источник</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3" /></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-line-3">
                  <td className="px-5 py-3 font-bold">{String(s.data.university)}<div className="text-xs font-normal text-muted">{new Date(s.created_at).toLocaleDateString("ru-RU")}</div></td>
                  <td className="px-5 py-3">{countryName(String(s.data.country))}</td>
                  <td className="px-5 py-3">{s.data.aiDraft ? "черновик ИИ" : "ученик"}</td>
                  <td className="px-5 py-3">{s.status === "pending" ? "ждёт проверки" : s.status === "approved" ? "одобрено" : "отклонено"}</td>
                  <td className="px-5 py-3 text-right">{s.status === "pending" && <button className="font-bold text-primary" onClick={() => { setOpen(s); setDraft({ ...s.data, verifiedAt: null }); setMsg(null); }}>Проверить</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && draft && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(10,14,28,.5)]" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal className="h-full w-full max-w-[760px] overflow-y-auto bg-surface-solid p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold">Проверка: {String(draft.university)}</h2>
            <p className="mt-1 text-sm text-body">Сверьте с официальным сайтом. Дата в «Проверено экспертом» уберёт у учеников плашку «ориентировочно».</p>
            <div className="mt-5"><AutoForm value={draft} onChange={setDraft} /></div>
            <div className="sticky bottom-0 mt-6 flex gap-2 bg-surface-solid py-3">
              <button className="btn-secondary" onClick={() => act("reject")}>Отклонить</button>
              <button className="btn-secondary" onClick={() => setDraft({ ...draft, verifiedAt: new Date().toISOString().slice(0, 10) })}>Отметить «проверено сегодня»</button>
              <button className="btn-primary flex-1" onClick={() => act("approve")}>Одобрить в каталог</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
