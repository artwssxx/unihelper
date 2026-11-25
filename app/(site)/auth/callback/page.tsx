"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginCard from "@/components/auth/LoginCard";
import { supabaseBrowser } from "@/lib/supabaseClient";

// Возврат после входа по ссылке из письма или через Google (PKCE).
export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [dest, setDest] = useState("/dashboard");
  useEffect(() => {
    (async () => {
      const sb = await supabaseBrowser();
      const sp = new URLSearchParams(location.search);
      const next = sp.get("next");
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      setDest(dest);
      const code = sp.get("code");
      // Ссылка из письма (неявный поток): токены — в #фрагменте адреса.
      const hash = new URLSearchParams(location.hash.slice(1));
      const errDesc = sp.get("error_description") || hash.get("error_description");
      if (errDesc) return setErr("Ссылка устарела или уже использована. Запросите новое письмо или войдите через Telegram.");
      const at = hash.get("access_token"), rt = hash.get("refresh_token");
      if (sb && at && rt) {
        history.replaceState(null, "", location.pathname + location.search);
        const { error } = await sb.auth.setSession({ access_token: at, refresh_token: rt });
        if (error) return setErr("Не получилось войти по ссылке. Запросите новое письмо.");
        return router.replace(dest);
      }
      if (!sb || !code) return setErr("Ссылка для входа неполная или устарела.");
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) setErr("Не получилось завершить вход — ссылка открылась в другом браузере или устарела. Войдите ещё раз.");
      else router.replace(dest);
    })();
  }, [router]);
  // Ссылка не сработала (частый случай на телефоне: письмо открылось в другом браузере) — вход по коду.
  if (err) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="max-w-md rounded-2xl bg-orange-soft px-4 py-3 text-sm font-semibold text-orange-ink-2">{err}</p>
        <LoginCard next={dest} haveCode={process.env.NEXT_PUBLIC_EMAIL_OTP === "1"} />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center" role="status">
        <p className="font-semibold">Входим…</p>
      </div>
    </div>
  );
}
