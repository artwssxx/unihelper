"use client";

import { useCallback, useEffect, useState } from "react";

type Status = { configured: boolean; username: string | null; webhook: string | null; webhookOk: boolean; pending: number; lastError: string | null; cron: boolean };
type Setup = { ok: boolean; steps: { name: string; ok: boolean; note?: string }[] };

export default function AdminTelegram() {
  const [st, setSt] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch("/api/admin/telegram", { cache: "no-store" }).then((r) => r.json()).then(setSt), []);
  useEffect(() => {
    load();
  }, [load]);

  async function run(action: "setup" | "digest") {
    setBusy(true);
    const r = await fetch("/api/admin/telegram", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (action === "setup") setSetup(j);
    else setDigest(r.ok ? `Проверено: ${j.checked}, отправлено: ${j.sent}.` : "Не получилось.");
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Telegram-бот</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">
          Бот открывает UniHelper как мини-приложение, отвечает на вопросы через AI Advisor, по понедельникам присылает план и сообщает о новых сообщениях в комьюнити.
          Нужны переменные <code>TELEGRAM_BOT_TOKEN</code> и <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>, для рассылки — <code>CRON_SECRET</code>.
        </p>
      </div>
      {!st ? (
        <p className="text-muted">Загрузка…</p>
      ) : !st.configured ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">Токен бота не задан.</p>
      ) : (
        <div className="card space-y-3">
          <Row label="Бот" value={st.username ? `@${st.username}` : "не отвечает — проверьте токен"} ok={Boolean(st.username)} />
          <Row label="Вебхук" value={st.webhookOk ? "подключён" : st.webhook ? `указан другой адрес: ${st.webhook}` : "не подключён"} ok={st.webhookOk} />
          <Row label="Еженедельная рассылка" value={st.cron ? "включена (понедельник, 11:00 по Ташкенту)" : "нет CRON_SECRET"} ok={st.cron} />
          {st.pending > 0 && <Row label="Ждут обработки" value={String(st.pending)} ok={false} />}
          {st.lastError && <Row label="Последняя ошибка" value={st.lastError} ok={false} />}
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn-primary" disabled={busy} onClick={() => run("setup")}>{st.webhookOk ? "Обновить настройки бота" : "Подключить бота"}</button>
            <button className="btn-secondary" disabled={busy || !st.webhookOk} onClick={() => run("digest")}>Разослать план сейчас</button>
          </div>
          {setup && (
            <ul className="space-y-1 text-sm">
              {setup.steps.map((s) => (
                <li key={s.name} className={s.ok ? "text-green" : "text-red"}>{s.ok ? "Готово" : "Ошибка"}: {s.name}{s.note && !s.ok ? ` — ${s.note}` : ""}</li>
              ))}
            </ul>
          )}
          {digest && <p className="text-sm font-semibold">{digest}</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-3 pb-2 text-sm">
      <span className="font-semibold">{label}</span>
      <span className={ok ? "text-green" : "text-orange-ink-2"}>{value}</span>
    </div>
  );
}
