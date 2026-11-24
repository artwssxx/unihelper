"use client";

import { useState } from "react";
import * as I from "@/components/icons";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.reload();
    else {
      setErr(r.status === 401 ? "Неверный пароль" : r.status === 429 ? "Слишком много попыток, подождите" : "Админка не настроена");
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2.5"><I.Logo /><span className="text-lg font-extrabold">UniHelper · админка</span></div>
        {!configured ? (
          <p className="text-sm text-body">Админка не настроена: задайте переменную окружения <b>ADMIN_PASSWORD</b> в настройках Vercel и сделайте повторный деплой.</p>
        ) : (
          <>
            <label className="block text-sm font-semibold">
              Пароль
              <input className="input mt-1.5" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            </label>
            {err && <p className="text-sm font-semibold text-red">{err}</p>}
            <button className="btn-primary w-full" disabled={busy || !pw}>{busy ? "Входим…" : "Войти"}</button>
          </>
        )}
      </form>
    </div>
  );
}
