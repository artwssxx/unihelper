"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as I from "@/components/icons";
import { apiFetch } from "@/lib/auth";
import { refreshCoins, useCoins } from "@/lib/useCoins";

// Баланс UniCoins в шапке + ежедневный заход (один раз в день: награда и серия).
export default function CoinPill() {
  const { enabled, state } = useCoins();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const day = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("uh-checkin") === day) return;
      localStorage.setItem("uh-checkin", day);
    } catch {}
    apiFetch("/api/coins/checkin", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { awarded: number; streak: number } | null) => {
        if (!j?.awarded) return;
        setToast(`+${j.awarded} UniCoins · серия ${j.streak} ${j.streak % 10 === 1 && j.streak % 100 !== 11 ? "день" : j.streak % 10 >= 2 && j.streak % 10 <= 4 && (j.streak % 100 < 12 || j.streak % 100 > 14) ? "дня" : "дней"}`);
        refreshCoins();
        setTimeout(() => setToast(null), 5000);
      })
      .catch(() => {});
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <Link
        href="/coins"
        aria-label={`UniCoins: ${state?.balance ?? 0}`}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-extrabold tabular-nums"
      >
        <I.Coin size={18} className="text-orange" />
        {state?.balance ?? "…"}
        {state && state.streak > 1 && (
          <span className="ml-1 hidden items-center gap-0.5 text-xs font-bold text-muted sm:inline-flex">
            <I.Flame size={14} className="text-orange" />
            {state.streak}
          </span>
        )}
      </Link>
      {toast && (
        <div role="status" className="fixed right-4 top-4 z-[80] flex items-center gap-2 rounded-2xl border border-line bg-surface-solid px-4 py-3 text-sm font-bold shadow-2xl">
          <I.Coin size={18} className="text-orange" />
          {toast}
        </div>
      )}
    </>
  );
}
