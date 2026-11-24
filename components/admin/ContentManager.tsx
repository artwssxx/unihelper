"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentKind } from "@/lib/content/schemas";
import AutoForm from "./AutoForm";

type Item = { id: string; data: Record<string, unknown> | null; source: "code" | "edited" | "added" | "deleted"; updatedAt?: string };

const SOURCE: Record<Item["source"], { l: string; c: string }> = {
  code: { l: "из кода", c: "bg-line-3 text-muted" },
  edited: { l: "изменено", c: "bg-primary-soft text-primary-ink" },
  added: { l: "добавлено", c: "bg-green-soft text-green" },
  deleted: { l: "скрыто", c: "bg-red-soft text-red" },
};

export default function ContentManager(props: {
  kind: ContentKind;
  title: string;
  subtitle: string;
  columns: { label: string; render: (d: Record<string, unknown>) => React.ReactNode }[];
  template: () => Record<string, unknown>;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [storage, setStorage] = useState<string>("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ value: Record<string, unknown>; isNew: boolean } | null>(null);
  const [mode, setMode] = useState<"form" | "json">("form");
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/content?kind=${props.kind}`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setItems(j.items);
      setStorage(j.storage);
    }
  }, [props.kind]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(
    () => (items ?? []).filter((i) => !q || JSON.stringify(i.data ?? {}).toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  async function call(method: string, body: unknown) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/content", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ ok: false, text: j.message ?? j.error ?? "Ошибка" });
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    let value = edit!.value;
    if (mode === "json") {
      try {
        value = JSON.parse(json);
      } catch {
        return setMsg({ ok: false, text: "JSON с ошибкой" });
      }
    }
    if (await call("PUT", { kind: props.kind, data: value })) {
      setMsg({ ok: true, text: "Сохранено — изменения уже на сайте" });
      setEdit(null);
    }
  }

  const open = (value: Record<string, unknown>, isNew: boolean) => {
    setEdit({ value: structuredClone(value), isNew });
    setJson(JSON.stringify(value, null, 2));
    setMode("form");
    setMsg(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight">{props.title}</h1>
          <p className="mt-1 max-w-[720px] text-sm text-body">{props.subtitle}</p>
        </div>
        <button className="btn-primary" onClick={() => open(props.template(), true)} disabled={storage === "readonly"}>+ Добавить</button>
      </div>

      {storage === "readonly" && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">
          Режим только для чтения: на Vercel правки хранятся в базе. Подключите Supabase и выполните миграцию 0003 — тогда сохранение заработает.
        </p>
      )}
      {storage === "file" && (
        <p className="rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-primary-ink">
          Локальный режим: правки сохраняются в файл .data/content.json. В продакшене — в Supabase.
        </p>
      )}
      {msg && <p className={`rounded-2xl px-5 py-3 text-sm font-semibold ${msg.ok ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>{msg.text}</p>}

      <input className="input max-w-md" placeholder="Поиск" aria-label="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              {props.columns.map((c) => <th key={c.label} className="px-5 py-3 font-semibold">{c.label}</th>)}
              <th className="px-5 py-3 font-semibold">Источник</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {items === null && <tr><td className="px-5 py-6 text-muted" colSpan={9}>Загрузка…</td></tr>}
            {shown.map((i) => (
              <tr key={i.id} className={`border-t border-line-3 ${i.source === "deleted" ? "opacity-50" : ""}`}>
                {props.columns.map((c) => <td key={c.label} className="px-5 py-3 align-top">{i.data ? c.render(i.data) : "—"}</td>)}
                <td className="px-5 py-3 align-top"><span className={`pill ${SOURCE[i.source].c}`}>{SOURCE[i.source].l}</span></td>
                <td className="whitespace-nowrap px-5 py-3 text-right align-top">
                  {i.source !== "deleted" && <button className="font-bold text-primary" onClick={() => open(i.data!, false)}>Изменить</button>}
                  {i.source === "edited" || i.source === "deleted" ? (
                    <button className="ml-4 font-bold text-muted" disabled={busy || storage === "readonly"} onClick={() => call("POST", { kind: props.kind, action: "reset", id: i.id })}>Вернуть из кода</button>
                  ) : (
                    <button
                      className="ml-4 font-bold text-red"
                      disabled={busy || storage === "readonly"}
                      onClick={() => confirm(`Скрыть «${i.id}» с сайта?`) && call("DELETE", { kind: props.kind, id: i.id })}
                    >
                      {i.source === "added" ? "Удалить" : "Скрыть"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(10,14,28,.5)]" onClick={() => setEdit(null)}>
          <div role="dialog" aria-modal aria-labelledby="editT" className="h-full w-full max-w-[760px] overflow-y-auto bg-surface-solid p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="editT" className="text-xl font-extrabold">{edit.isNew ? "Новый элемент" : `Изменить: ${edit.value.id as string}`}</h2>
              <div className="flex rounded-xl bg-line-3 p-1 text-sm font-bold">
                {(["form", "json"] as const).map((m) => (
                  <button
                    key={m}
                    className={`rounded-lg px-3 py-1.5 ${mode === m ? "bg-surface-solid text-ink" : "text-muted"}`}
                    onClick={() => {
                      if (m === "json") setJson(JSON.stringify(edit.value, null, 2));
                      else {
                        try {
                          setEdit({ ...edit, value: JSON.parse(json) });
                        } catch {
                          return setMsg({ ok: false, text: "JSON с ошибкой" });
                        }
                      }
                      setMode(m);
                    }}
                  >
                    {m === "form" ? "Форма" : "JSON"}
                  </button>
                ))}
              </div>
            </div>
            {msg && !msg.ok && <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 text-sm font-semibold text-red">{msg.text}</p>}
            <div className="mt-5">
              {mode === "form" ? (
                <AutoForm value={edit.value} lockId={!edit.isNew} onChange={(v) => setEdit({ ...edit, value: v })} />
              ) : (
                <textarea className="input min-h-[60vh] font-mono text-[13px]" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} aria-label="JSON" />
              )}
            </div>
            <div className="sticky bottom-0 mt-6 flex gap-2 bg-surface-solid py-3">
              <button className="btn-secondary" onClick={() => setEdit(null)}>Отмена</button>
              <button className="btn-primary flex-1" onClick={save} disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
