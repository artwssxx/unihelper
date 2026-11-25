"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

// Возврат после входа по ссылке из письма или через Google (PKCE).
export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const sb = await supabaseBrowser();
      const sp = new URLSearchParams(location.search);
      const next = sp.get("next");
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      const code = sp.get("code");
      const errDesc = sp.get("error_description");
      if (errDesc) return setErr(errDesc);
      if (!sb || !code) return setErr("Ссылка для входа неполная или устарела.");
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) setErr("Ссылка устарела или открыта в другом браузере. Запросите новую.");
      else router.replace(dest);
    })();
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center">
        {err ? (
          <>
            <p className="font-semibold">{err}</p>
            <a href="/login" className="btn-primary mt-4">Войти снова</a>
          </>
        ) : (
          <p className="font-semibold">Входим…</p>
        )}
      </div>
    </div>
  );
}
