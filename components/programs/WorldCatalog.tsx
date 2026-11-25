"use client";

import { useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import UniDetails, { loadUniProfileRetry } from "@/components/programs/UniDetails";
import { countryName } from "@/lib/countries";
import type { Major, Program } from "@/lib/types";
import { programFromProfile } from "@/lib/uniProfile";

type Hit = { name: string; country: string; web: string | null; programId: string | null; programName?: string };
type Res = { items: Hit[]; total: number; page: number; pages: number; totalWorld: number; facets?: { country: string; count: number }[] };

/**
 * «Все вузы мира»: 10 000+ вузов из открытого справочника. Карточку вуза и данные для оценки собирает
 * система (общий кеш, ИИ один раз для всех) — ученик ничего не заполняет. Ручная форма — только если данных нет.
 */
export default function WorldCatalog(props: {
  myCountries?: string[];
  major: Major;
  onAdd: (p: Program) => void;
  onManual: (h: Hit) => void;
  onOpen: (programId: string) => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [open, setOpen] = useState<Hit | null>(null);
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

  const keyOf = (h: Hit) => `${h.country}:${h.name}`;
  async function add(h: Hit) {
    setAdding(keyOf(h));
    setFailed(null);
    const r = await loadUniProfileRetry({ name: h.name, country: h.country, web: h.web });
    setAdding(null);
    if ("error" in r) return setFailed(keyOf(h));
    setOpen(null);
    props.onAdd(programFromProfile({ name: h.name, country: h.country, web: h.web }, r.profile, props.major));
  }

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
          Нажми «Подробнее» — UniHelper соберёт карточку вуза: рейтинги, стоимость, требования, стипендии и сроки. «Добавить и оценить» — вуз попадёт в подборку с оценкой по твоему профилю, заполнять ничего не нужно.
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
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {h.programId ? (
                <button className="btn-secondary w-full py-2 text-sm" onClick={() => props.onOpen(h.programId!)}>
                  <I.Check size={15} /> Есть в подборке — открыть оценку
                </button>
              ) : (
                <>
                  <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setOpen(h)}>Подробнее</button>
                  <button className="btn-primary flex-1 py-2 text-sm" disabled={adding === keyOf(h)} onClick={() => add(h)}>
                    {adding === keyOf(h) ? "Собираем данные…" : "Добавить и оценить"}
                  </button>
                </>
              )}
              {failed === keyOf(h) && (
                <p className="w-full text-xs text-muted">
                  Не удалось собрать данные автоматически. <button className="font-bold text-primary" onClick={() => props.onManual(h)}>Заполнить вручную</button>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {res && res.total === 0 && <p className="card text-center text-body">Ничего не нашли. Попробуй другое написание или убери фильтр страны.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(10,14,28,.5)]" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal aria-labelledby="uniT" className="h-full w-full max-w-[640px] overflow-y-auto bg-surface-solid p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="uniT" className="text-2xl font-extrabold leading-tight" translate="no">{open.name}</h2>
                <p className="text-sm text-muted">{countryName(open.country)}</p>
              </div>
              <button className="rounded-lg p-2 text-muted hover:bg-line-3" aria-label="Закрыть" onClick={() => setOpen(null)}><I.Close size={20} /></button>
            </div>
            <div className="sticky top-0 z-10 -mx-5 mt-4 border-b border-line bg-surface-solid px-5 py-3 sm:-mx-6 sm:px-6">
              <button className="btn-primary w-full" disabled={adding === keyOf(open)} onClick={() => add(open)}>
                {adding === keyOf(open) ? "Добавляем…" : "Добавить в подборку и оценить"}
              </button>
            </div>
            <div className="mt-4"><UniDetails uni={{ name: open.name, country: open.country, web: open.web }} /></div>
          </div>
        </div>
      )}

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
