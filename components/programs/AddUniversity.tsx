"use client";

import { useEffect, useRef, useState } from "react";
import { loadUniProfileRetry } from "@/components/programs/UniDetails";
import { countryName } from "@/lib/countries";
import { t } from "@/lib/i18n/ru";
import { MAJORS } from "@/lib/profileConst";
import type { Major, Program } from "@/lib/types";
import { programFromProfile } from "@/lib/uniProfile";

type Hit = { name: string; country: string; web: string | null; programId: string | null; programName?: string };

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "uni";

export function emptyCustom(name: string, country: string, web: string | null, major: Major): Program {
  return {
    id: `custom-${slug(name)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Бакалавриат", university: name, country, city: "", isLocal: country === "UZ", isPartner: false, isCustom: true,
    majors: [major], url: web, qsRank: null, acceptanceRate: null,
    typical: { gpa100: null, ielts: null, sat: null },
    requirements: { minIelts: null, minGpa100: null, satRequired: false },
    tuitionUsd: NaN, livingUsd: country === "UZ" ? 2500 : 10000,
    funding: { type: "none", basis: "none", needBlindIntl: null, availableToUz: true, note: "" },
    weights: { essay: 0.3, recommendations: 0.2, interview: 0.2 }, isFullGrant: false,
    deadlineNote: "сверить на официальном сайте", verifiedAt: null,
  };
}

/** Модалка «Добавить свой вуз»: поиск по справочнику → данные подтягиваются сами (общий кеш), форма — чтобы поправить. */
export default function AddUniversity(props: {
  major: Major;
  initial?: Program;
  onSave: (p: Program) => void;
  onOpenCatalog: (programId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(props.initial?.university ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [p, setP] = useState<Program | null>(props.initial ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (p) return;
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) return setHits([]);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/universities/search?q=${encodeURIComponent(q.trim())}`).catch(() => null);
      if (r?.ok) setHits((await r.json()).items);
    }, 180);
  }, [q, p]);

  const set = (patch: Partial<Program>) => setP((x) => (x ? { ...x, ...patch } : x));
  const num = (v: string) => (v === "" ? null : Number(v));

  /** Подтянуть данные вуза из общей базы UniHelper (ИИ собирает один раз для всех). */
  async function autoFill(base: Program) {
    setBusy(true);
    setMsg(null);
    const r = await loadUniProfileRetry({ name: base.university, country: base.country, web: base.url });
    setBusy(false);
    if ("error" in r) return setMsg("Данных об этом вузе пока нет — заполните главное по официальному сайту: стоимость и требования.");
    const filled = programFromProfile({ name: base.university, country: base.country, web: base.url }, r.profile, props.major);
    setConfidence(r.profile.confidence);
    setP({ ...filled, id: base.id, name: base.name || filled.name });
  }
  const pick = (base: Program) => {
    setP(base);
    autoFill(base);
  };

  const valid = p && p.university.trim() && Number.isFinite(p.tuitionUsd) && p.tuitionUsd >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,14,28,.5)] p-3 sm:items-center" onClick={props.onClose}>
      <div role="dialog" aria-modal aria-labelledby="addT" className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-[24px] bg-surface-solid p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="addT" className="text-xl font-extrabold">{props.initial && !(props.initial as { fresh?: boolean }).fresh ? "Изменить свой вуз" : "Добавить свой вуз"}</h2>
        {!p ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">
              Название вуза
              <input className="input mt-1.5" autoFocus placeholder="Начните вводить: Seoul, Westminster, Budapest…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <ul className="divide-y divide-line-3 overflow-hidden rounded-2xl border border-line" role="listbox" aria-label="Подсказки">
              {hits.map((h) => (
                <li key={`${h.name}-${h.country}`}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-primary-soft"
                    onClick={() => (h.programId ? props.onOpenCatalog(h.programId) : pick(emptyCustom(h.name, h.country, h.web, props.major)))}
                  >
                    <span>
                      <span className="font-semibold">{h.name}</span>
                      <span className="block text-xs text-muted">{countryName(h.country)}{h.programName ? ` · ${h.programName}` : ""}</span>
                    </span>
                    {h.programId ? <span className="pill bg-green-soft text-green">есть в каталоге</span> : <span className="pill bg-line-3 text-muted">добавить</span>}
                  </button>
                </li>
              ))}
              {q.trim().length >= 2 && (
                <li>
                  <button className="w-full px-4 py-3 text-left text-sm font-bold text-primary hover:bg-primary-soft" onClick={() => setP(emptyCustom(q.trim(), "UZ", null, props.major))}>
                    Нет в списке — добавить «{q.trim()}» вручную
                  </button>
                </li>
              )}
            </ul>
            <p className="text-xs text-muted">Подсказки — из справочника вузов мира (10 000+). Стоимость, требования и стипендии UniHelper подтянет сам — вам останется проверить.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-line-3 px-4 py-3">
              <div>
                <div className="font-extrabold">{p.university}</div>
                <div className="text-xs text-muted">{countryName(p.country)}{p.url ? ` · ${p.url}` : ""}</div>
              </div>
              <button className="btn-secondary py-2.5 text-sm" onClick={() => p && autoFill(p)} disabled={busy}>{busy ? "Собираем данные…" : "Обновить данные"}</button>
            </div>
            {p.aiDraft && (
              <p className="rounded-xl bg-orange-soft px-4 py-3 text-sm text-orange-ink-2">
                Данные собраны ИИ{confidence ? ` (уверенность: ${confidence === "high" ? "высокая" : confidence === "medium" ? "средняя" : "низкая"})` : ""} и не проверены экспертом. Можно сохранить как есть или поправить цифры по официальному сайту.
              </p>
            )}
            {msg && <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-ink">{msg}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Программа"><input className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} /></F>
              <F label="Специальность">
                <select className="input" value={Array.isArray(p.majors) ? p.majors[0] : "any"} onChange={(e) => set({ majors: e.target.value === "any" ? "any" : [e.target.value as Major] })}>
                  <option value="any">любая</option>
                  {MAJORS.map((m) => <option key={m} value={m}>{t.majors[m]}</option>)}
                </select>
              </F>
              <F label="Код страны (ISO2)"><input className="input" maxLength={2} value={p.country} onChange={(e) => set({ country: e.target.value.toUpperCase(), isLocal: e.target.value.toUpperCase() === "UZ" })} /></F>
              <F label="Город"><input className="input" value={p.city} onChange={(e) => set({ city: e.target.value })} /></F>
              <F label="Обучение, $ в год *"><input className="input" type="number" min={0} value={Number.isFinite(p.tuitionUsd) ? p.tuitionUsd : ""} placeholder="обязательно, примерно" onChange={(e) => set({ tuitionUsd: e.target.value === "" ? NaN : Number(e.target.value) })} /></F>
              <F label="Проживание, $ в год"><input className="input" type="number" min={0} value={p.livingUsd} onChange={(e) => set({ livingUsd: Number(e.target.value) || 0 })} /></F>
              <F label="Мин. IELTS"><input className="input" type="number" step="0.5" value={p.requirements.minIelts ?? ""} placeholder="нет данных" onChange={(e) => set({ requirements: { ...p.requirements, minIelts: num(e.target.value) } })} /></F>
              <F label="Acceptance rate, %"><input className="input" type="number" min={0} max={100} value={p.acceptanceRate == null ? "" : Math.round(p.acceptanceRate * 100)} placeholder="нет данных" onChange={(e) => set({ acceptanceRate: e.target.value === "" ? null : Number(e.target.value) / 100 })} /></F>
              <F label="Типичный IELTS поступивших"><input className="input" type="number" step="0.5" value={p.typical.ielts ?? ""} placeholder="нет данных" onChange={(e) => set({ typical: { ...p.typical, ielts: num(e.target.value) } })} /></F>
              <F label="Типичный GPA (из 100)"><input className="input" type="number" value={p.typical.gpa100 ?? ""} placeholder="нет данных" onChange={(e) => set({ typical: { ...p.typical, gpa100: num(e.target.value) } })} /></F>
              <F label="Финансирование">
                <select className="input" value={p.funding.type} onChange={(e) => set({ funding: { ...p.funding, type: e.target.value as Program["funding"]["type"], basis: e.target.value === "none" ? "none" : p.funding.basis === "none" ? "merit" : p.funding.basis } })}>
                  <option value="none">нет / неизвестно</option><option value="partial">частичное</option><option value="full">полное</option>
                </select>
              </F>
              <label className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-3 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5" checked={p.requirements.satRequired} onChange={(e) => set({ requirements: { ...p.requirements, satRequired: e.target.checked } })} /> SAT обязателен
              </label>
              <F label="Сроки и примечания" wide><input className="input" value={p.deadlineNote} onChange={(e) => set({ deadlineNote: e.target.value.slice(0, 290) })} /></F>
            </div>
            <div className="flex flex-wrap gap-2">
              {!props.initial && <button className="btn-secondary" onClick={() => setP(null)}>Другой вуз</button>}
              <button className="btn-secondary" onClick={props.onClose}>Отмена</button>
              <button className="btn-primary flex-1" disabled={!valid} onClick={() => valid && props.onSave(p)}>Сохранить и оценить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`block text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}>{label}<div className="mt-1.5">{children}</div></label>;
}
