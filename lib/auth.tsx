"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { load, save, subscribe, type Stored } from "./clientStore";
import { LIMITS, type Plan } from "./plans";
import { mergeStates } from "./stateMerge";
import { supabaseBrowser } from "./supabaseClient";

interface AuthCtx {
  ready: boolean;
  enabled: boolean;
  session: Session | null;
  user: { id: string; email: string | null; name: string | null; provider: string } | null;
  plan: Plan;
  planExpiresAt: number | null;
  testProAllowed: boolean;
  signOut: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  setPlan: (action: "activate-test" | "cancel") => Promise<boolean>;
}

const Ctx = createContext<AuthCtx | null>(null);

/** fetch с токеном сессии (для API, которым нужен аккаунт). */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const sb = supabaseBrowser();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!sb);
  const [plan, setPlanState] = useState<Plan>("free");
  const [planExpiresAt, setExp] = useState<number | null>(null);
  const [testProAllowed, setTestAllowed] = useState(true);
  const synced = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPlan = useCallback(async () => {
    const r = await fetch("/api/plan", { cache: "no-store" }).catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      setPlanState(j.plan);
      setExp(j.expiresAt);
      setTestAllowed(j.testAllowed);
    }
  }, []);

  // Первичная синхронизация после входа: объединяем браузер и аккаунт.
  const syncFromServer = useCallback(async (s: Session) => {
    if (synced.current === s.user.id) return;
    synced.current = s.user.id;
    const r = await apiFetch("/api/me/state", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = await r.json();
    const merged = mergeStates(load(), (j.data ?? {}) as Stored);
    save(merged);
    await apiFetch("/api/me/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: merged }) });
    await refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    refreshPlan();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (data.session) syncFromServer(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) syncFromServer(s);
      else synced.current = null;
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, syncFromServer, refreshPlan]);

  // Дальнейшие изменения — в аккаунт с задержкой 2 с.
  useEffect(() => {
    if (!session) return;
    return subscribe(() => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        apiFetch("/api/me/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: load() }) }).catch(() => {});
      }, 2000);
    });
  }, [session]);

  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
    setSession(null);
  }, [sb]);

  const setPlan = useCallback(async (action: "activate-test" | "cancel") => {
    const r = await apiFetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    await refreshPlan();
    return r.ok;
  }, [refreshPlan]);

  const u = session?.user;
  const meta = (u?.user_metadata ?? {}) as Record<string, string>;
  const user = u
    ? {
        id: u.id,
        email: u.email && !u.email.endsWith("@telegram.unihelper.app") ? u.email : null,
        name: meta.full_name || meta.name || null,
        provider: meta.provider || (u.app_metadata?.provider as string) || "email",
      }
    : null;

  return (
    <Ctx.Provider value={{ ready, enabled: Boolean(sb), session, user, plan, planExpiresAt, testProAllowed, signOut, refreshPlan, setPlan }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function usePlan() {
  const { plan, planExpiresAt, testProAllowed, setPlan } = useAuth();
  return { plan, limits: LIMITS[plan], isPro: plan === "pro", planExpiresAt, testProAllowed, setPlan };
}
