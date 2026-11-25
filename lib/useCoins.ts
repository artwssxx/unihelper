"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, useAuth } from "@/lib/auth";
import type { CoinState, ShopItemId, TaskId } from "@/lib/coins";
import { useStore } from "@/lib/clientStore";

// Общее состояние кошелька UniCoins для всех компонентов (один запрос на страницу).
let cache: CoinState | null = null;
let pending: Promise<CoinState | null> | null = null;
const subs = new Set<(s: CoinState | null) => void>();

async function fetchState(): Promise<CoinState | null> {
  const r = await apiFetch("/api/coins", { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  return (await r.json()) as CoinState;
}

export async function refreshCoins(): Promise<CoinState | null> {
  pending = fetchState().then((s) => {
    cache = s;
    subs.forEach((f) => f(s));
    pending = null;
    return s;
  });
  return pending;
}

export function useCoins() {
  const { user } = useAuth();
  const store = useStore();
  const [state, setState] = useState<CoinState | null>(cache);
  const enabled = Boolean(user) && !store?.demo?.active;

  useEffect(() => {
    if (!enabled) return;
    subs.add(setState);
    if (!cache && !pending) refreshCoins();
    else if (cache) setState(cache);
    return () => {
      subs.delete(setState);
    };
  }, [enabled]);

  const buy = useCallback(async (item: ShopItemId, ref?: string): Promise<{ ok: boolean; message?: string; pro?: boolean }> => {
    const r = await apiFetch("/api/coins/buy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ item, ref }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    await refreshCoins();
    return r?.ok ? { ok: true, pro: j.pro } : { ok: false, message: j.message ?? "Не получилось." };
  }, []);

  const claim = useCallback(async (task: TaskId): Promise<{ ok: boolean; message?: string; awarded?: number }> => {
    const r = await apiFetch("/api/coins/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    await refreshCoins();
    return { ok: Boolean(r?.ok), message: j.message, awarded: j.awarded };
  }, []);

  return { enabled, state: enabled ? state : null, buy, claim, refresh: refreshCoins };
}
