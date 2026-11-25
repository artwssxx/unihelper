"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, useAuth } from "@/lib/auth";

type Payment = { status: "pending" | "approved" | "rejected"; access_until: string | null };
type Checkout = { card: string | null; payment: Payment | null };

const errors: Record<string, string> = {
  too_large: "Размер скриншота должен быть не больше 3 МБ.",
  invalid_image: "Прикрепите скриншот в формате PNG, JPEG или WebP.",
  duplicate: "Этот чек уже отправлен или у вас есть чек на проверке.",
  active: "Акционная подписка уже действует.",
};

export default function BuyProPage() {
  const { user, refreshPlan } = useAuth();
  const userId = user?.id;
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    apiFetch("/api/plan/payments", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data: Checkout = await res.json();
        if (!current) return;
        setCheckout(data);
        if (data.payment?.status === "approved") void refreshPlan();
      })
      .catch(() => { if (current) setError("Не удалось загрузить страницу оплаты. Обновите страницу."); });
    return () => { current = false; };
  }, [userId, refreshPlan]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("receipt");
    if (!(file instanceof File) || !file.size) return;
    setError("");
    if (file.size > 3 * 1024 * 1024) {
      setError(errors.too_large);
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/plan/payments", { method: "POST", body: file });
      if (!res.ok) {
        const data = await res.json();
        setError(errors[data.error] ?? "Не удалось отправить чек. Попробуйте ещё раз.");
        return;
      }
      setCheckout((previous) => previous && { ...previous, payment: { status: "pending", access_until: null } });
    } catch {
      setError("Не удалось отправить чек. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const payment = checkout?.payment;
  const active = payment?.status === "approved" && payment.access_until && Date.parse(payment.access_until) > Date.now();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link className="text-sm font-bold text-primary" href="/pricing">← К тарифам</Link>
      <section className="card space-y-4">
        <h1 className="text-3xl font-extrabold">Pro на 2 месяца</h1>
        <p className="text-body">В честь открытия — 30 000 сум и ранний доступ к новым функциям.</p>
        {!userId ? <Link className="btn-primary inline-flex" href="/login?next=/pricing/buy">Войти для оплаты</Link> :
          payment?.status === "pending" ? <p role="status">Чек получен и ожидает подтверждения.</p> :
          active ? <p role="status">Оплата подтверждена. Pro и ранний доступ действуют до {new Date(payment.access_until!).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}.</p> :
          checkout?.card ? (
            <form className="space-y-4" onSubmit={submit}>
              {payment?.status === "rejected" && <p role="status">Чек отклонён. Если перевод уже сделан, можно приложить корректный скриншот.</p>}
              <p>Переведите 30 000 сум на карту <strong className="block text-xl tabular-nums">{checkout.card}</strong></p>
              <label className="block text-sm font-semibold">
                Скриншот чека (PNG, JPEG или WebP, до 3 МБ)
                <input className="mt-2 block w-full" type="file" name="receipt" accept="image/png,image/jpeg,image/webp" required disabled={busy} />
              </label>
              <button className="btn-primary" disabled={busy}>{busy ? "Отправляем…" : "Отправить чек"}</button>
            </form>
          ) : checkout ? <p>Оплата пока недоступна.</p> : !error && <p role="status">Загружаем оплату…</p>}
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
