"use client";

import { useState } from "react";

type Probe = {
  url: string; status: number | null; finalUrl: string | null; error?: string; cookieNames: string[]; title?: string;
  forms: { action: string | null; method: string; inputs: { name: string; type: string }[] }[];
  captcha: boolean; scripts: string[]; hints: string[]; apiPaths: string[]; text?: string;
};

// Проверка связи с eMaktab и EMIS с сервера: открывается ли вход, какие поля у формы, есть ли капча.
// Нужна, чтобы быстро понять, почему импорт оценок перестал работать (сайт обновился, блокирует запросы и т. п.).
export default function AdminIntegrations() {
  const [res, setRes] = useState<Probe[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  async function run(q: string) {
    setBusy(true);
    const r = await fetch(`/api/admin/integrations?${q}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    setRes(j?.results ?? []);
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Школьные системы</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">
          Импорт оценок входит в eMaktab как браузер, по логину и паролю ученика (пароль не сохраняется). Здесь видно, отвечает ли сайт с сервера и как устроена форма входа.
          Для EMIS прямого импорта пока нет — проверка покажет, как устроен вход, чтобы его подключить.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy} onClick={() => run("target=emaktab")}>Проверить eMaktab</button>
        <button className="btn-primary" disabled={busy} onClick={() => run("target=emis")}>Проверить EMIS</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" placeholder="https://emis.edu.uz/… (только eMaktab и EMIS)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn-secondary" disabled={busy || !url} onClick={() => run(`url=${encodeURIComponent(url)}`)}>Открыть адрес</button>
      </div>
      {busy && <p className="text-muted">Проверяем…</p>}
      {res?.map((p) => (
        <section key={p.url} className="card space-y-2 text-sm">
          <h2 className="m-0 break-all text-base font-extrabold">{p.url}</h2>
          <p>Статус: <b>{p.error ? `ошибка — ${p.error}` : p.status}</b>{p.finalUrl && p.finalUrl !== p.url ? ` → ${p.finalUrl}` : ""}{p.title ? ` · «${p.title}»` : ""}</p>
          <p>Признаки: {p.hints.join(", ") || "—"} · капча: {p.captcha ? "есть" : "нет"} · cookie: {p.cookieNames.join(", ") || "—"}</p>
          {p.forms.map((f, i) => (
            <p key={i} className="break-all">Форма {f.method.toUpperCase()} {f.action ?? "(тот же адрес)"}: {f.inputs.map((x) => `${x.name} [${x.type}]`).join(", ")}</p>
          ))}
          {p.apiPaths.length > 0 && <p className="break-all">API в коде страницы: {p.apiPaths.slice(0, 40).join(", ")}</p>}
          {p.scripts.length > 0 && <p className="break-all text-muted">Скрипты: {p.scripts.join(", ")}</p>}
          {p.text && <p className="break-all text-muted">{p.text}</p>}
        </section>
      ))}
    </div>
  );
}
