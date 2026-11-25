"use client";

import { useEffect, useState } from "react";
import { apiFetch, useAuth } from "@/lib/auth";

// Профиль ребёнка: код для родителей и подключённые родители (можно отключить в любой момент).
export default function ParentsCard() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [parents, setParents] = useState<{ id: string; name: string; since: string | null }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => apiFetch("/api/family/parents").then(async (r) => r.ok && setParents((await r.json()).items)).catch(() => {});
  useEffect(() => {
    if (user) load();
  }, [user]);
  if (!user) return null;

  async function showCode() {
    setBusy(true);
    const r = await apiFetch("/api/family/code").catch(() => null);
    if (r?.ok) setCode((await r.json()).code);
    setBusy(false);
  }
  async function revoke(id: string, name: string) {
    if (!confirm(`Отключить «${name}»? Он(а) больше не увидит твой прогресс.`)) return;
    await apiFetch(`/api/family/parents?id=${id}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-xl font-extrabold">Родители</h2>
      <p className="text-sm text-body">Родитель увидит силу профиля, моки, план и вузы — но не переписку и не тексты эссе. Подключить можно только по твоему коду, отключить — в любой момент.</p>
      {code ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-line bg-bg px-4 py-2 font-mono text-2xl font-extrabold tracking-[0.3em]" translate="no">{code}</span>
          <span className="text-sm text-muted">Родитель вводит код в «Кабинете родителя».</span>
        </div>
      ) : (
        <button className="btn-secondary" onClick={showCode} disabled={busy}>{busy ? "Получаем…" : "Показать код для родителя"}</button>
      )}
      {parents.length > 0 && (
        <ul className="divide-y divide-line-3 text-sm">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span><b translate="no">{p.name}</b>{p.since && <span className="ml-2 text-xs text-muted">с {new Date(p.since).toLocaleDateString("ru-RU")}</span>}</span>
              <button className="text-xs font-bold text-muted hover:text-red" onClick={() => revoke(p.id, p.name)}>Отключить</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
