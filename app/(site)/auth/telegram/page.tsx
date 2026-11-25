"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { finishTelegramLogin } from "@/components/auth/LoginCard";

// Возврат после входа через Telegram (виджет в режиме перенаправления — надёжно на телефонах).
// Telegram добавляет к адресу id, first_name, username, photo_url, auth_date и hash; подпись проверяет сервер.
const FIELDS = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"];

export default function TelegramReturn() {
  const router = useRouter();
  const [err, setErr] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const next = sp.get("next");
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    let data: Record<string, string> = Object.fromEntries(FIELDS.filter((k) => sp.has(k)).map((k) => [k, sp.get(k)!]));
    // Другой формат возврата Telegram: #tgAuthResult=<base64 JSON>
    const raw = new URLSearchParams(location.hash.slice(1)).get("tgAuthResult");
    if (!data.hash && raw) {
      try {
        const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
        const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, string | number>;
        data = Object.fromEntries(Object.entries(json).filter(([k]) => FIELDS.includes(k)).map(([k, v]) => [k, String(v)]));
      } catch {}
    }
    if (!data.hash || !data.id) return setErr(true);
    finishTelegramLogin({ mode: "widget", data }).then((ok) => (ok ? router.replace(dest) : setErr(true)));
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md text-center" role="status">
        {err ? (
          <>
            <p className="font-semibold">Не получилось войти через Telegram. Попробуйте ещё раз.</p>
            <a href="/login" className="btn-primary mt-4">Войти снова</a>
          </>
        ) : (
          <p className="font-semibold">Входим через Telegram…</p>
        )}
      </div>
    </div>
  );
}
