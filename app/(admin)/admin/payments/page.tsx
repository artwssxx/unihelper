"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { id: string; user_id: string | null; status: "pending" | "approved" | "rejected"; amount: number; created_at: string };
type Payments = { items: Row[]; pending: number; approved: number; totalSum: number; hasMore: boolean };
const labels = { pending: "На проверке", approved: "Подтверждён", rejected: "Отклонён" };

export default function AdminPaymentsPage() {
  const [data, setData] = useState<Payments | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/payments?page=${page}`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    setData(await res.json());
  }, [page]);

  useEffect(() => {
    load().catch(() => setError("Не удалось загрузить оплаты."));
  }, [load]);

  async function review(id: string, approve: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approve }),
      });
      await load();
      if (!res.ok) setError("Не удалось обработать чек. Проверьте его текущий статус.");
    } catch {
      setError("Не удалось обновить оплаты. Обновите страницу.");
    } finally {
      setBusy(false);
    }
  }

  function navigate(next: number) {
    setData(null);
    setError("");
    setPage(next);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Оплаты Pro</h1>
      {error && <p role="alert">{error}</p>}
      {data ? (
        <>
          <div className="card flex flex-wrap gap-x-6 gap-y-2">
            <span>На проверке <b>{data.pending}</b></span>
            <span>Подтверждено <b>{data.approved}</b></span>
            <span>Получено <b>{data.totalSum.toLocaleString("ru-RU")} сум</b></span>
          </div>
          {data.items.length === 0 && <p>Оплат пока нет.</p>}
          {data.items.map((item) => (
            <article key={item.id} className="card space-y-3">
              <p className="font-bold">{item.amount.toLocaleString("ru-RU")} сум · {labels[item.status]}</p>
              <p className="break-all text-sm text-muted">{new Date(item.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })} · {item.user_id ?? "Аккаунт удалён"}</p>
              <div className="flex flex-wrap items-center gap-4">
                <a className="text-sm font-bold text-primary" href={`/api/admin/payments?receipt=${item.id}`} target="_blank" rel="noreferrer">Открыть чек</a>
                {item.status === "pending" && (
                  <>
                    <button className="btn-primary" disabled={busy || !item.user_id} onClick={() => review(item.id, true)}>Подтвердить</button>
                    <button className="text-sm font-bold text-muted" disabled={busy} onClick={() => review(item.id, false)}>Отклонить</button>
                  </>
                )}
              </div>
            </article>
          ))}
          <div className="flex gap-4">
            {page > 0 && <button disabled={busy} onClick={() => navigate(page - 1)}>Назад</button>}
            {data.hasMore && <button disabled={busy} onClick={() => navigate(page + 1)}>Дальше</button>}
          </div>
        </>
      ) : !error && <p role="status">Загружаем оплаты…</p>}
    </div>
  );
}
