"use client";

import { useCallback, useEffect, useState } from "react";
import { ORG_KINDS } from "@/lib/community";

type Report = {
  id: string; target_type: "post" | "message" | "profile" | "org"; target_id: string; reason: string;
  status: "open" | "resolved" | "dismissed"; created_at: string; target: { text: string; hidden: boolean } | null;
};
type OrgRow = { id: string; slug: string; name: string; kind: string; city: string | null; description: string; verified: boolean; hidden: boolean; created_at: string };
type Data = { reports: Report[] | null; orgs: OrgRow[] | null; stats?: { people: number; posts: number; messages: number } };

const TYPE = { post: "проект", message: "сообщение", profile: "карточка", org: "организация" } as const;
const STATUS = { open: "ждёт решения", resolved: "скрыто", dismissed: "отклонена" } as const;

export default function AdminCommunity() {
  const [d, setD] = useState<Data | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/admin/community", { cache: "no-store" }).then((r) => r.json()).then(setD), []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(payload: Record<string, string>, done: string) {
    const r = await fetch("/api/admin/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setMsg(r.ok ? done : "Не получилось, попробуйте ещё раз.");
    load();
  }

  const open = d?.reports?.filter((r) => r.status === "open") ?? [];
  const closed = d?.reports?.filter((r) => r.status !== "open") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight">Комьюнити</h1>
        <p className="mt-1 max-w-[760px] text-sm text-body">
          Жалобы учеников и организации. «Скрыть» убирает проект, сообщение, карточку или организацию у всех; решение можно отменить. Проверенные организации показываются выше и с отметкой.
        </p>
      </div>
      {msg && <p className="rounded-2xl bg-green-soft px-5 py-3 text-sm font-semibold text-green">{msg}</p>}
      {d === undefined ? (
        <p className="text-muted">Загрузка…</p>
      ) : d.reports === null ? (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">Нужна база данных (Supabase).</p>
      ) : (
        <>
          {d.stats && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Участников с карточкой" value={d.stats.people} />
              <Stat label="Проектов и вопросов" value={d.stats.posts} />
              <Stat label="Сообщений" value={d.stats.messages} />
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Жалобы {open.length ? <span className="pill ml-1 bg-red-soft text-red">{open.length}</span> : null}</h2>
            {open.length === 0 && <p className="text-muted">Открытых жалоб нет.</p>}
            {open.map((r) => (
              <ReportCard key={r.id} r={r}>
                <button className="btn-primary px-4 py-2 text-sm" onClick={() => act({ reportId: r.id, action: "hide" }, "Скрыто у всех.")}>Скрыть</button>
                <button className="btn-secondary px-4 py-2 text-sm" onClick={() => act({ reportId: r.id, action: "dismiss" }, "Жалоба отклонена.")}>Нарушения нет</button>
              </ReportCard>
            ))}
            {closed.length > 0 && (
              <details className="card">
                <summary className="cursor-pointer font-bold">Рассмотренные ({closed.length})</summary>
                <div className="mt-3 space-y-3">
                  {closed.map((r) => (
                    <ReportCard key={r.id} r={r}>
                      {r.target?.hidden && <button className="btn-secondary px-4 py-2 text-sm" onClick={() => act({ reportId: r.id, action: "restore" }, "Возвращено.")}>Вернуть</button>}
                    </ReportCard>
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Организации</h2>
            {(d.orgs ?? []).length === 0 && <p className="text-muted">Организаций пока нет.</p>}
            {(d.orgs ?? []).length > 0 && (
              <div className="card overflow-x-auto p-0">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-muted">
                    <tr><th className="px-5 py-3">Название</th><th className="px-5 py-3">Тип</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3" /></tr>
                  </thead>
                  <tbody>
                    {d.orgs!.map((o) => (
                      <tr key={o.id} className="border-t border-line-3 align-top">
                        <td className="px-5 py-3"><div className="font-bold">{o.name}</div><div className="max-w-[420px] text-xs text-muted">{o.description.slice(0, 160)}</div></td>
                        <td className="px-5 py-3">{ORG_KINDS.find((k) => k.id === o.kind)?.label ?? o.kind}{o.city ? ` · ${o.city}` : ""}</td>
                        <td className="px-5 py-3">{o.hidden ? "скрыта" : o.verified ? "проверена" : "не проверена"}</td>
                        <td className="space-x-3 whitespace-nowrap px-5 py-3 text-right">
                          <button className="font-bold text-primary" onClick={() => act({ orgId: o.id, action: o.verified ? "unverify" : "verify" }, o.verified ? "Отметка снята." : "Организация проверена.")}>
                            {o.verified ? "Снять отметку" : "Проверена"}
                          </button>
                          <button className="font-bold text-red" onClick={() => act({ orgId: o.id, action: o.hidden ? "show-org" : "hide-org" }, o.hidden ? "Показана." : "Скрыта.")}>
                            {o.hidden ? "Показать" : "Скрыть"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-[30px] font-extrabold tabular-nums">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function ReportCard({ r, children }: { r: Report; children: React.ReactNode }) {
  return (
    <div className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <span className="pill bg-line-3 text-ink">{TYPE[r.target_type]}</span>
        <span>{new Date(r.created_at).toLocaleString("ru-RU")}</span>
        <span>· {STATUS[r.status]}</span>
      </div>
      <p className="text-sm"><b>Причина:</b> {r.reason}</p>
      <blockquote className="whitespace-pre-line rounded-xl bg-line-3 px-4 py-3 text-sm text-body">
        {r.target ? r.target.text.slice(0, 600) : "Содержимое удалено автором."}
      </blockquote>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
