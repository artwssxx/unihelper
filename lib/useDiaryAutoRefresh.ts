"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, useAuth } from "./auth";
import { update, useStore } from "./clientStore";
import { applySchoolImport } from "./schoolImport";

const STALE = 2 * 3600_000; // дневнику больше 2 часов — обновляем сам
const TRY_KEY = "uh-diary-refresh-at";
let inflight: Promise<unknown> | null = null;

export type AutoState = "idle" | "refreshing" | "done" | "expired" | "error";

/** Автообновление дневника по сохранённой сессии: при открытии страницы, если данные старше 2 часов; и по кнопке. */
export function useDiaryAutoRefresh() {
  const store = useStore();
  const { user } = useAuth();
  const diary = store?.diary;
  const [state, setState] = useState<AutoState>("idle");

  const refresh = useCallback(async (): Promise<AutoState> => {
    if (!diary?.auto || !user) return "expired";
    setState("refreshing");
    try { sessionStorage.setItem(TRY_KEY, String(Date.now())); } catch { /* без отметки */ }
    const run = (inflight ??= apiFetch("/api/grades/refresh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source: diary.source }) })
      .then((r) => r.json())
      .finally(() => { inflight = null; }));
    const j = (await run.catch(() => null)) as { status?: string; items?: never; diary?: never } | null;
    if (j?.status === "ok") {
      const r = j as unknown as Parameters<typeof applySchoolImport>[0] & { diary: NonNullable<typeof diary> };
      applySchoolImport({ ...r, source: diary.source, diary: { ...r.diary, auto: true } });
      setState("done");
      return "done";
    }
    if (j?.status === "expired") {
      update((s) => ({ diary: s.diary ? { ...s.diary, auto: false } : s.diary }));
      setState("expired");
      return "expired";
    }
    setState("error");
    return "error";
  }, [diary?.auto, diary?.source, user]);

  useEffect(() => {
    if (!diary?.auto || !user) return;
    if (Date.now() - Date.parse(diary.fetchedAt) < STALE) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem(TRY_KEY)) || 0; } catch { /* нет хранилища */ }
    if (Date.now() - last < 10 * 60_000) return; // не чаще раза в 10 минут на вкладку
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diary?.auto, diary?.fetchedAt, user]);

  const disableAuto = useCallback(async () => {
    if (!diary) return;
    await apiFetch(`/api/grades/link?source=${diary.source}`, { method: "DELETE" }).catch(() => null);
    update((s) => ({ diary: s.diary ? { ...s.diary, auto: false } : s.diary }));
  }, [diary]);

  return { state, refresh, disableAuto };
}
