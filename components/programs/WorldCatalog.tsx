"use client";

import { useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import { countryName } from "@/lib/countries";

type Hit = { name: string; country: string; web: string | null; programId: string | null; programName?: string };
type Res = { items: Hit[]; total: number; page: number; pages: number; totalWorld: number; facets?: { country: string; count: number }[] };

/** «Все вузы мира»: 10 000+ вузов из открытого справочника — найти, добавить в подборку и получить оценку. */
export default function WorldCatalog(props: { myCountries?: string[]; onAdd: (h: Hit) => void; onOpen: (programId: string) => void }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Res | null>(null);
  const [facets, setFacets] = useState<Res["facets"]>();
  const [loading, setLoading] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      const sp = new URLSearchParams({ q, country, page: String(page), ...(facets ? {} : { facets: "1" }) });
      const r = await fetch(`/api/universities/browse?${sp}`, { signal: ctrl.signal }).catch(() => null);
      if (r?.ok) {
        const j = (await r.json()) as Res;
        setRes(j);
        if (j.facets) setFacets(j.facets);
      }
      setLoading(false);
    }, q ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // facets загружаем один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, country, page]);

  const go = (p: number) => {
    setPage(p);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="space-y-4" ref={top}>
      <div className="card space-y-3 p-5">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
          <input className="input" placeholder="Название вуза: Seoul, Budapest, Technical…" aria-label="Поиск вуза" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <select className="input" aria-label="Страна" value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}>
            <option value="">Все страны</option>
            {(facets ?? []).map((f) => (
              <option key={f.country} value={f.country}>{countryName(f.country)} ({f.count})</option>
            ))}
          </select>
        </div>
        {(props.myCountries ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Твои страны:</span>
            {props.myCountries!.map((c) => (
              <button key={c} className="chip px-3 py-1 text-sm" data-on={country === c} onClick={() => { setCountry(country === c ? "" : c); setPage(1); }}>{countryName(c)}</button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">
          Открытый справочник вузов мира: название, страна и сайт. Требований и цен в нём нет — добавь вуз в подборку, заполни их сам или с ИИ, и UniHelper посчитает оценку по твоему профилю.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>{res ? `Найдено: ${res.total.toLocaleString("ru-RU")} из ${res.totalWorld.toLocaleString("ru-RU")}` : "Загружаем…"}</span>
        {loading && <span>обновляем…</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {res?.items.map((h) => (
          <article key={`${h.name}-${h.country}`} className="card flex flex-col gap-2 p-4">
            <div className="font-extrabold leading-snug">{h.name}</div>
            <div className="text-xs text-muted">{countryName(h.country)}</div>
            {h.web && (
              <a href={h.web} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-xs font-bold text-primary">
                {h.web.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
              </a>
            )}
            <div className="mt-auto pt-2">
              {h.programId ? (
                <button className="btn-secondary w-full py-2 text-sm" onClick={() => props.onOpen(h.programId!)}>
                  <I.Check size={15} /> Есть в подборке — открыть оценку
                </button>
              ) : (
                <button className="btn-primary w-full py-2 text-sm" onClick={() => props.onAdd(h)}>
                  Добавить и оценить
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {res && res.total === 0 && <p className="card text-center text-body">Ничего не нашли. Попробуй другое написание или убери фильтр страны.</p>}

      {res && res.pages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Страницы">
          <button className="btn-secondary px-3 py-2 text-sm" disabled={res.page <= 1} onClick={() => go(res.page - 1)}>← Назад</button>
          <span className="text-sm tabular-nums text-muted">{res.page} / {res.pages}</span>
          <button className="btn-secondary px-3 py-2 text-sm" disabled={res.page >= res.pages} onClick={() => go(res.page + 1)}>Дальше →</button>
        </nav>
      )}
    </section>
  );
}
