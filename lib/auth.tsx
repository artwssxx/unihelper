"use client";

import { track } from "@/lib/analytics";
import { getLang } from "./i18n/lang";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { load, save, subscribe, type Stored } from "./clientStore";
import { LIMITS, type Plan } from "./plans";
import { mergeStates } from "./stateMerge";
import { authEnabled, supabaseBrowser } from "./supabaseClient";

interface AuthCtx {
  ready: boolean;
  enabled: boolean;
  session: Session | null;
  /** Данные аккаунта уже объединены с браузером (до этого локальный профиль может быть неполным). */
  stateReady: boolean;
  user: { id: string; email: string | null; name: string | null; provider: string } | null;
  plan: Plan;
  planExpiresAt: number | null;
  earlyAccessUntil: number | null;
  testProAllowed: boolean;
  signOut: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  setPlan: (action: "activate-test" | "cancel") => Promise<boolean>;
}

const Ctx = createContext<AuthCtx | null>(null);

/** fetch с токеном сессии (для API, которым нужен аккаунт). */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const sb = await supabaseBrowser();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  headers.set("x-uh-lang", getLang()); // язык ответов ИИ
  return fetch(input, { ...init, headers });
}

/** Сессия из localStorage без загрузки supabase-js: кабинет открывается сразу, библиотека потом подтвердит. */
function storedSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (!/^sb-.+-auth-token$/.test(k)) continue;
      const s = JSON.parse(localStorage.getItem(k) ?? "null") as Session | null;
      if (s?.access_token && s.user?.id) return s;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!authEnabled);
  const [plan, setPlanState] = useState<Plan>("free");
  const [planExpiresAt, setExp] = useState<number | null>(null);
  const [earlyAccessUntil, setEarlyAccessUntil] = useState<number | null>(null);
  const [testProAllowed, setTestAllowed] = useState(true);
  const synced = useRef<string | null>(null);
  const [syncedUser, setSyncedUser] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPlan = useCallback(async () => {
    const r = await apiFetch("/api/plan", { cache: "no-store" }).catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      setPlanState(j.plan);
      setExp(j.expiresAt);
      setEarlyAccessUntil(j.earlyAccessUntil ?? null);
      setTestAllowed(j.testAllowed);
    }
  }, []);

  // Первичная синхронизация после входа: объединяем браузер и аккаунт.
  const syncFromServer = useCallback(async (s: Session) => {
    if (synced.current === s.user.id) return;
    synced.current = s.user.id;
    const r = await apiFetch("/api/me/state", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return setSyncedUser(s.user.id); // сервер недоступен — дальше решают данные браузера
    const j = await r.json();
    const merged = mergeStates(load(), (j.data ?? {}) as Stored);
    save(merged);
    setSyncedUser(s.user.id);
    await apiFetch("/api/me/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: merged }) });
    await refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    refreshPlan();
    if (!authEnabled) return;
    const cached = storedSession();
    if (cached) {
      setSession(cached);
      setReady(true);
    }
    let unsub = () => {};
    let off = false;
    supabaseBrowser().then((sb) => {
      if (!sb || off) return;
      sb.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setReady(true);
        if (data.session) syncFromServer(data.session);
      });
      const { data: sub } = sb.auth.onAuthStateChange((e, s) => {
        setSession(s);
        if (e === "SIGNED_IN" && s) {
          const k = `uh-login-tracked:${s.user.id}`;
          try {
            if (!sessionStorage.getItem(k)) {
              sessionStorage.setItem(k, "1");
              track("login", { method: String(s.user.user_metadata?.provider || s.user.app_metadata?.provider || "email") });
            }
          } catch {}
        }
        if (s) syncFromServer(s);
        else synced.current = null;
      });
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => {
      off = true;
      unsub();
    };
  }, [syncFromServer, refreshPlan]);

  // Флаг сессии на <html>: экран входа, отрисованный до проверки, прячется CSS (см. AuthGate).
  useEffect(() => {
    if (ready) document.documentElement.toggleAttribute("data-auth", Boolean(session));
  }, [ready, session]);

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
    await (await supabaseBrowser())?.auth.signOut();
    setSession(null);
    await refreshPlan();
  }, [refreshPlan]);

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
    <Ctx.Provider value={{ ready, enabled: authEnabled, session, stateReady: !session || syncedUser === session.user.id, user, plan, planExpiresAt, earlyAccessUntil, testProAllowed, signOut, refreshPlan, setPlan }}>
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
