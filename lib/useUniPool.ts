"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./auth";
import { getLang } from "./i18n/lang";
import type { Major, Program } from "./types";
import { poolProgram, type UniProfile, type UniRef } from "./uniProfile";

type Item = { ref: UniRef; profile: UniProfile };
const mem = new Map<string, { at: number; items: Item[]; growing: boolean }>();
const TTL = 5 * 60_000;
const EMPTY: Item[] = [];

/**
 * Вузы из общей базы по странам ученика (карточки, собранные ИИ один раз для всех).
 * Пока база по стране пополняется, раз в 40 секунд подтягиваем новые карточки (до 3 раз).
 */
export function useUniPool(countries: string[], major: Major): { programs: Program[]; loading: boolean; growing: boolean } {
  const key = `${getLang()}:${[...countries].sort().join(",")}`;
  const [state, setState] = useState<{ key: string; items: Item[]; growing: boolean; loading: boolean }>(() => {
    const c = mem.get(key);
    return { key, items: c?.items ?? [], growing: c?.growing ?? false, loading: !c };
  });

  useEffect(() => {
    if (!countries.length) return;
    let alive = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (force = false) => {
      const c = mem.get(key);
      if (c && !force && Date.now() - c.at < TTL) {
        setState({ key, items: c.items, growing: c.growing, loading: false });
        if (!c.growing) return;
      } else {
        const r = await apiFetch(`/api/universities/pool?countries=${encodeURIComponent(countries.join(","))}`).catch(() => null);
        const j = r?.ok ? await r.json().catch(() => null) : null;
        if (!alive) return;
        const next = { at: Date.now(), items: (j?.items ?? []) as Item[], growing: Boolean(j?.growing) };
        mem.set(key, next);
        setState({ key, items: next.items, growing: next.growing, loading: false });
        if (!next.growing) return;
      }
      if (tries++ < 3) timer = setTimeout(() => load(true), 40_000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const items = state.key === key ? state.items : EMPTY;
  const programs = useMemo(() => items.map((i) => poolProgram(i.ref, i.profile, major)), [items, major]);
  return { programs, loading: countries.length > 0 && state.loading, growing: state.growing };
}
