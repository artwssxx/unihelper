"use client";

import Link from "next/link";
import { useState } from "react";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { shopItem, type ShopItemId } from "@/lib/coins";
import { useCoins } from "@/lib/useCoins";

// Всё про закрытые Pro-функции: бейдж с замком, кнопка «за UniCoins» и блок с размытым превью.

/** Покупка открытия за UniCoins (или ссылка на вход). */
export function CoinUnlockButton({ item, refId, onUnlocked, className = "" }: { item: ShopItemId; refId?: string; onUnlocked?: () => void; className?: string }) {
  const it = shopItem(item);
  const { user } = useAuth();
  const { enabled, state, buy } = useCoins();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!it) return null;
  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(typeof location !== "undefined" ? location.pathname : "/coins")}`} className={`btn-secondary gap-1.5 ${className}`}>
        <I.Coin size={16} className="text-orange" /> Войти и открыть за {it.price}
      </Link>
    );
  }
  if (!enabled) return null;
  const short = state ? it.price - state.balance : 0;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        className={`btn-secondary gap-1.5 ${className}`}
        disabled={busy || !state || short > 0}
        title={short > 0 ? `Не хватает ${short} UniCoins` : undefined}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const r = await buy(item, refId);
          setBusy(false);
          if (r.ok) onUnlocked?.();
          else setErr(r.message ?? "Не получилось.");
        }}
      >
        <I.Coin size={16} className="text-orange" />
        {busy ? "Открываем…" : `Открыть за ${it.price}`}
      </button>
      {short > 0 && (
        <Link href="/coins" className="text-xs font-bold text-primary">Не хватает {short} — как заработать</Link>
      )}
      {err && <span className="text-xs font-semibold text-red">{err}</span>}
    </span>
  );
}

/** Бейдж «PRO» с замком (компактно) или плашка с кнопками (полная форма). */
export default function ProLock({ title, text, compact = false, coins, refId, onUnlocked }: { title: string; text?: string; compact?: boolean; coins?: ShopItemId; refId?: string; onUnlocked?: () => void }) {
  if (compact) {
    return (
      <Link href={coins ? "/coins" : "/pricing"} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold text-white" style={{ background: "var(--grad)" }} title={`Доступно в Pro${coins ? " или за UniCoins" : ""}`}>
        <I.Lock size={12} /> PRO · {title}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-primary-soft-2 bg-primary-soft px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white" style={{ background: "var(--grad)" }}><I.Lock size={18} /></span>
          <div>
            <div className="font-extrabold text-primary-ink">{title}</div>
            {text && <p className="mt-1 text-sm text-body">{text}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {coins && <CoinUnlockButton item={coins} refId={refId} onUnlocked={onUnlocked} className="py-2.5 text-sm" />}
          <Link href="/pricing" className="btn-primary py-2.5 text-sm">Открыть в Pro</Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Закрытый блок: показывает размытое превью (`preview`) под замком. Открывается Pro или покупкой за UniCoins.
 * Превью — пример, а не настоящие данные (их на клиенте нет до открытия).
 */
export function ProGate({ title, text, preview, coins, refId, onUnlocked, className = "" }: { title: string; text?: string; preview: React.ReactNode; coins?: ShopItemId; refId?: string; onUnlocked?: () => void; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-primary-soft-2 ${className}`}>
      <div aria-hidden className="pointer-events-none select-none p-4 opacity-70 blur-[5px]">{preview}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--surface-solid)_70%,transparent)] to-[var(--surface-solid)] p-4">
        <div className="max-w-[420px] text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "var(--grad)" }}><I.Lock size={20} /></span>
          <div className="mt-2 font-extrabold">{title}</div>
          {text && <p className="mt-1 text-sm text-body">{text}</p>}
          <div className="mt-3 flex flex-wrap items-start justify-center gap-2">
            {coins && <CoinUnlockButton item={coins} refId={refId} onUnlocked={onUnlocked} className="py-2.5 text-sm" />}
            <Link href="/pricing" className="btn-primary py-2.5 text-sm">Открыть в Pro</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
