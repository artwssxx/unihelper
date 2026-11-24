"use client";

import { useState } from "react";
import * as I from "@/components/icons";
import { apiFetch } from "@/lib/auth";
import { gradeLabel, type PublicProfile } from "@/lib/community";
import { t } from "@/lib/i18n/ru";

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }): Promise<{ ok: boolean; status: number; data: T & { message?: string; error?: string } }> {
  const { json, ...rest } = init ?? {};
  const res = await apiFetch(url, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }).catch(() => null);
  if (!res) return { ok: false, status: 0, data: { message: "Нет связи с сервером." } as T & { message?: string } };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function majorLabel(m: string | null): string | null {
  if (!m) return null;
  return (t.majors as Record<string, string>)[m] ?? m;
}

export function personMeta(p: PublicProfile): string {
  return [gradeLabel(p.grade), p.city, majorLabel(p.major)].filter(Boolean).join(" · ");
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";
  return (
    <span
      aria-hidden
      className="inline-flex flex-none items-center justify-center rounded-full font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: "var(--grad)" }}
    >
      {ini}
    </span>
  );
}

export function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "primary" }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={`pill ${tone === "primary" ? "bg-primary-soft text-primary-ink" : "bg-line-3 text-body"}`}>
          {x}
        </span>
      ))}
    </div>
  );
}

export function SafetyNote() {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-body">
      <I.Warn size={18} className="mt-0.5 flex-none" />
      <p>
        Общайся внутри UniHelper. Не отправляй телефон, адрес, пароли и фото документов. Если кто-то ведёт себя странно — нажми «Пожаловаться» или заблокируй: модератор проверит.
      </p>
    </div>
  );
}

/** Кнопка жалобы с маленьким окном для причины. */
export function ReportButton({ type, id, className = "" }: { type: "post" | "message" | "profile" | "org"; id: string | number; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function send() {
    setState("sending");
    const r = await api("/api/community/report", { method: "POST", json: { targetType: type, targetId: String(id), reason } });
    setState(r.ok ? "sent" : "error");
  }
  return (
    <>
      <button className={`text-xs font-bold text-muted hover:text-red ${className}`} onClick={() => setOpen(true)}>
        Пожаловаться
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,14,28,.5)] p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal aria-labelledby="rep-t" className="w-full max-w-[460px] space-y-3 rounded-[22px] bg-surface-solid p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="rep-t" className="text-lg font-extrabold">Пожаловаться</h2>
            {state === "sent" ? (
              <>
                <p className="text-sm text-body">Спасибо. Модератор посмотрит жалобу. Если тебе неприятно общение — заблокируй участника.</p>
                <button className="btn-primary w-full" onClick={() => setOpen(false)}>Закрыть</button>
              </>
            ) : (
              <>
                <textarea className="input min-h-24" autoFocus value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Что не так: спам, оскорбления, просит личные данные…" aria-label="Причина жалобы" />
                {state === "error" && <p className="text-sm font-semibold text-red">Не получилось отправить. Попробуй ещё раз.</p>}
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => setOpen(false)}>Отмена</button>
                  <button className="btn-primary flex-1" disabled={reason.trim().length < 3 || state === "sending"} onClick={send}>
                    {state === "sending" ? "Отправляем…" : "Отправить"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} дн назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
