"use client";

import { useMemo, useState } from "react";
import { Close } from "@/components/icons";
import { ALL_COUNTRIES, countryName, POPULAR_COUNTRIES } from "@/lib/countries";

const MAX = 12;
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Выбор стран: популярные чипами, остальные — поиском по всем странам мира. */
export default function CountryPicker({ value, onChange, compact }: { value: string[]; onChange: (v: string[]) => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : value.length >= MAX ? value : [...value, c]);
  const extra = value.filter((c) => !POPULAR_COUNTRIES.includes(c));
  const popular = compact ? POPULAR_COUNTRIES.slice(0, 10) : POPULAR_COUNTRIES;
  // Поиск по названию на текущем языке страницы и по-русски (словарь переводит русские названия).
  const found = useMemo(() => {
    const n = norm(q);
    if (n.length < 2) return [];
    let names: Intl.DisplayNames | null = null;
    try {
      const lang = document.documentElement.lang || "ru";
      if (lang !== "ru") names = new Intl.DisplayNames([lang], { type: "region" });
    } catch { /* старый браузер — только русские названия */ }
    return ALL_COUNTRIES.filter((c) => norm(countryName(c)).includes(n) || (names && norm(names.of(c) ?? "").includes(n)) || c.toLowerCase() === n)
      .sort((a, b) => Number(!norm(countryName(a)).startsWith(n)) - Number(!norm(countryName(b)).startsWith(n)))
      .slice(0, 8);
  }, [q]);

  return (
    <div className="space-y-3">
      <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-4"}>
        {popular.map((c) => (
          <button type="button" key={c} className="chip" data-on={value.includes(c)} aria-pressed={value.includes(c)} onClick={() => toggle(c)}>{countryName(c)}</button>
        ))}
      </div>
      {extra.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extra.map((c) => (
            <button type="button" key={c} className="chip inline-flex items-center gap-1.5" data-on aria-label={`Убрать: ${countryName(c)}`} onClick={() => toggle(c)}>
              {countryName(c)} <Close size={14} />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Другая страна: начни вводить название" aria-label="Поиск страны" />
        {found.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-line bg-surface-solid p-1 shadow-xl" role="listbox">
            {found.map((c) => (
              <li key={c}>
                <button type="button" role="option" aria-selected={value.includes(c)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-line-3"
                  onClick={() => { toggle(c); setQ(""); }}>
                  {countryName(c)}
                  {value.includes(c) && <span className="text-xs text-primary-ink">выбрано</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && !found.length && <p className="mt-1 text-xs text-muted">Страна не найдена.</p>}
      </div>
      {value.length >= MAX && <p className="text-xs text-muted">Можно выбрать до {MAX} стран.</p>}
    </div>
  );
}
