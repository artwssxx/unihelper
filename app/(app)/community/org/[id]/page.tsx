"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, Avatar, personMeta, ReportButton } from "@/components/community/ui";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { ORG_KINDS, plural, type Org, type PublicProfile } from "@/lib/community";

type Data = { org: Org; chatId: string | null; members: { role: "owner" | "member"; profile: PublicProfile }[] };

export default function OrgPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, user } = useAuth();
  const router = useRouter();
  const [d, setD] = useState<Data | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/community/orgs/${id}`);
    setD(r.ok ? r.data : null);
  }, [id]);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function act(action: "join" | "leave") {
    setBusy(true);
    setMsg(null);
    const r = await api<{ chatId?: string }>(`/api/community/orgs/${id}`, { method: "POST", json: { action } });
    setBusy(false);
    if (!r.ok) return setMsg(r.data.message ?? "Не получилось.");
    if (action === "join" && r.data.chatId) return router.push(`/community/chats?c=${r.data.chatId}`);
    load();
  }

  if (!ready) return null;
  if (!user) {
    return (
      <div className="card space-y-3">
        <p className="text-body">Войди, чтобы смотреть организации и вступать в них.</p>
        <Link href={`/login?next=/community/org/${id}`} className="btn-primary w-fit">Войти</Link>
      </div>
    );
  }
  if (d === undefined) return <p className="text-muted">Загрузка…</p>;
  if (d === null) {
    return (
      <div className="card space-y-2">
        <p className="font-bold">Организация не найдена.</p>
        <Link href="/community" className="text-sm font-bold text-primary">← Комьюнити</Link>
      </div>
    );
  }
  const o = d.org;
  return (
    <div className="space-y-5">
      <Link href="/community" className="text-sm font-bold text-primary">← Комьюнити</Link>
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill bg-line-3 text-body">{ORG_KINDS.find((k) => k.id === o.kind)?.label}</span>
          {o.verified ? <span className="pill bg-green-soft text-green"><I.Check size={12} /> проверена модератором</span> : <span className="pill bg-line-3 text-muted">не проверена</span>}
        </div>
        <h1 translate="no" className="text-[30px] font-extrabold tracking-tight">{o.name}</h1>
        <p className="text-sm text-muted">{[o.city, `${o.members} ${plural(o.members)}`].filter(Boolean).join(" · ")}</p>
        <p className="whitespace-pre-line text-body">{o.description}</p>
        {msg && <p className="text-sm font-semibold text-red">{msg}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {o.isMember ? (
            <>
              {d.chatId && <Link href={`/community/chats?c=${d.chatId}`} className="btn-primary"><I.Chat size={18} /> Открыть чат</Link>}
              {!o.isOwner && <button className="btn-secondary" disabled={busy} onClick={() => act("leave")}>Выйти</button>}
              {o.isOwner && <span className="text-sm font-semibold text-muted">Ты создатель</span>}
            </>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={() => act("join")}>Вступить</button>
          )}
          {!o.isOwner && <ReportButton type="org" id={o.id} />}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">Участники</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {d.members.map((m) => (
            <div key={m.profile.userId} className="card flex items-center gap-3">
              <Avatar name={m.profile.name} />
              <div className="min-w-0">
                <div className="truncate font-bold">{m.profile.name}{m.role === "owner" && <span className="ml-1.5 text-xs font-semibold text-muted">создатель</span>}</div>
                <div className="truncate text-xs text-muted">{personMeta(m.profile)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
