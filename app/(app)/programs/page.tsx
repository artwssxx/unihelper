"use client";

import { track } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import FitPills from "@/components/FitPills";
import NeedProfile from "@/components/NeedProfile";
import { ProGate } from "@/components/ProLock";
import { useCoins } from "@/lib/useCoins";
import AddUniversity, { emptyCustom } from "@/components/programs/AddUniversity";
import UniDetails from "@/components/programs/UniDetails";
import WorldCatalog from "@/components/programs/WorldCatalog";
import { apiFetch, usePlan } from "@/lib/auth";
import { update } from "@/lib/clientStore";
import { countryName } from "@/lib/countries";
import { t } from "@/lib/i18n/ru";
import type { ContactInfo } from "@/lib/profileSchema";
import { MAJORS } from "@/lib/profileConst";
import { FIT_LABEL_NAMES, FUNDING_LABEL_NAMES, totalCost } from "@/lib/scoring/fit";
import { matchPrograms, type MatchItem } from "@/lib/scoring/match";
import type { FitLabel, Major, Profile, Program } from "@/lib/types";
import { useContent } from "@/lib/useContent";
import { useUniPool } from "@/lib/useUniPool";
import { diffMatch, snapChanged, snapOf } from "@/lib/matchDiff";
import { useProfile } from "@/lib/useProfile";

type Tab = "match" | "mine" | "custom" | "world";
type Sort = "fit" | "cost" | "funding";
const ADM_ORDER: Record<FitLabel, number> = { high: 0, realistic: 1, ambitious: 2, not_eligible: 3 };
const FUND_ORDER = { self_funded: 0, high: 1, medium: 2, low: 3, none: 4 } as const;

export default function ProgramsPage() {
  const { profile, store } = useProfile();
  const { programs } = useContent();
  const { limits, isPro } = usePlan();
  const coins = useCoins();
  const [tab, setTab] = useState<Tab>("match");
  const [q, setQ] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [major, setMajor] = useState<Major | null>(null);
  const [maxCost, setMaxCost] = useState<number | "">("");
  const [funding, setFunding] = useState<"any" | "full" | "some">("any");
  const [label, setLabel] = useState<FitLabel | "all" | "eligible">("eligible");
  const [backupOnly, setBackupOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("fit");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Program | true | null>(null);
  const [leadFor, setLeadFor] = useState<MatchItem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = countries.length + (major ? 1 : 0) + (maxCost !== "" ? 1 : 0) + (funding !== "any" ? 1 : 0) + (label !== "eligible" ? 1 : 0) + (backupOnly ? 1 : 0);

  // Свои вузы ученика; вузы из общей базы, которые он добавил в список, хранятся рядом (pooled) и в лимит не входят.
  const custom = useMemo(() => (store?.customUnis ?? []).filter((p) => Number.isFinite(p.tuitionUsd) && !p.pooled), [store?.customUnis]);
  const pool = useUniPool(profile?.targetCountries ?? [], profile?.major ?? "cs");
  const pooled = useMemo(() => {
    const saved = (store?.customUnis ?? []).filter((p) => p.pooled);
    const fresh = new Map(pool.programs.map((p) => [p.id, p]));
    const own = new Set(custom.map((p) => p.university.toLowerCase()));
    // Свежая карточка из базы важнее сохранённой копии; вуз, который ученик добавил сам, не дублируем.
    return [...new Map([...saved, ...fresh.values()].map((p) => [p.id, fresh.get(p.id) ?? p])).values()].filter((p) => !own.has(p.university.toLowerCase()));
  }, [store?.customUnis, pool.programs, custom]);
  // Фильтр направления: по умолчанию — все направления ученика, иначе одно выбранное.
  const effProfile = useMemo<Profile | null>(() => (profile ? (major ? { ...profile, major, majors: [major] } : profile) : null), [profile, major]);
  const all = useMemo(() => {
    if (!effProfile) return [];
    const m = matchPrograms(effProfile, [...programs, ...custom, ...pooled]);
    return [...m.abroad, ...m.local];
  }, [effProfile, programs, custom, pooled]);

  // «Подбор обновился»: сравниваем метки с прошлым визитом (оценки, IELTS, страны изменились — метки тоже).
  const [changes, setChanges] = useState<ReturnType<typeof diffMatch> | null>(null);
  const fullMatch = useMemo(() => {
    if (!profile || !major) return all;
    const m = matchPrograms(profile, [...programs, ...custom, ...pooled]);
    return [...m.abroad, ...m.local];
  }, [all, major, profile, programs, custom, pooled]);
  useEffect(() => {
    if (!fullMatch.length || pool.loading) return;
    const t = setTimeout(() => {
      const prev = store?.matchSnap;
      const d = diffMatch(prev, fullMatch);
      if (d.up.length || d.down.length) setChanges(d);
      const next = snapOf(fullMatch);
      if (snapChanged(prev, next)) update(() => ({ matchSnap: next }));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullMatch, pool.loading]);

  if (profile === undefined) return null;
  if (profile === null || !effProfile) return <NeedProfile text="Подбор вузов считается по твоему профилю." />;

  const mine = store?.myPrograms ?? [];
  const presentCountries = [...new Set(all.map((i) => i.program.country))].sort((a, b) => countryName(a).localeCompare(countryName(b), "ru"));
  const detail = detailId ? all.find((i) => i.program.id === detailId) ?? null : null;

  const filtered = all
    .filter((i) => {
      const p = i.program;
      if (tab === "mine" && !mine.includes(p.id)) return false;
      if (tab === "custom" && !p.isCustom) return false;
      if (q && !`${p.university} ${p.name} ${p.city}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (countries.length && !countries.includes(p.country)) return false;
      if (maxCost !== "" && totalCost(p) > maxCost) return false;
      if (funding === "full" && p.funding.type !== "full") return false;
      if (funding === "some" && p.funding.type === "none") return false;
      if (tab === "match" && label === "eligible" && i.fit.admission.label === "not_eligible") return false;
      if (label !== "all" && label !== "eligible" && i.fit.admission.label !== label) return false;
      if (backupOnly && !i.fit.isBackup) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "cost"
        ? totalCost(a.program) - totalCost(b.program)
        : sort === "funding"
          ? FUND_ORDER[a.fit.funding.label] - FUND_ORDER[b.fit.funding.label] || ADM_ORDER[a.fit.admission.label] - ADM_ORDER[b.fit.admission.label]
          : ADM_ORDER[a.fit.admission.label] - ADM_ORDER[b.fit.admission.label] || FUND_ORDER[a.fit.funding.label] - FUND_ORDER[b.fit.funding.label],
    );

  const hasBackup = all.some((i) => i.fit.isBackup);
  const toggleMine = (id: string) => {
    if (!mine.includes(id) && mine.length >= limits.myPrograms) {
      setNote(`В Free можно держать в списке до ${limits.myPrograms} программ. В Pro — без лимита.`);
      return;
    }
    setNote(null);
    // Вуз из общей базы сохраняем копией: он нужен дорожной карте, главной и родителю, даже если база обновится.
    const fromPool = pooled.find((p) => p.id === id);
    update((s) => {
      const on = (s.myPrograms ?? []).includes(id);
      const rest = (s.customUnis ?? []).filter((x) => x.id !== id);
      return {
        myPrograms: on ? (s.myPrograms ?? []).filter((x) => x !== id) : [...(s.myPrograms ?? []), id],
        ...(fromPool ? { customUnis: on ? rest : [...rest, fromPool] } : {}),
      };
    });
  };
  const saveCustom = (raw: Program) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fresh: _f, ...p } = raw as Program & { fresh?: boolean };
    const exists = (store?.customUnis ?? []).some((x) => x.id === p.id);
    if (!exists && custom.length >= limits.customUniversities) {
      setNote(`В Free можно добавить до ${limits.customUniversities} своих вузов, в Pro — до 50.`);
      setAdding(null);
      return;
    }
    update((s) => ({ customUnis: [...(s.customUnis ?? []).filter((x) => x.id !== p.id), p] }));
    setAdding(null);
    setTab("custom");
    setNote(exists ? "Вуз обновлён, оценка пересчитана." : "Вуз добавлен и оценён по твоему профилю.");
  };
  const removeCustom = (id: string) => {
    update((s) => ({ customUnis: (s.customUnis ?? []).filter((x) => x.id !== id), myPrograms: (s.myPrograms ?? []).filter((x) => x !== id) }));
    setDetailId(null);
  };
  const resetFilters = () => {
    setQ(""); setCountries([]); setMajor(null); setMaxCost(""); setFunding("any"); setLabel("eligible"); setBackupOnly(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">ПОДБОР ВУЗОВ</div>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">Программы и <span className="serif-accent text-primary">гранты</span></h1>
          <p className="mt-2 max-w-[700px] text-body">
            Две отдельные оценки — поступление и финансирование — по каждой программе, без процентов. Каталог обновляет эксперт; свои вузы ты можешь добавить сам.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>+ Добавить свой вуз</button>
      </section>

      {!hasBackup && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-orange-ink-2">
          В подборке нет запасного варианта — программы, куда ты проходишь и которую семья может оплатить без гранта. Посмотри вузы Узбекистана или пересмотри бюджет в профиле.
        </p>
      )}
      {note && <p className="rounded-2xl bg-primary-soft px-5 py-3 text-sm font-semibold text-primary-ink">{note}</p>}
      {changes && (
        <div className="rounded-2xl bg-green-soft px-5 py-3 text-sm text-ink" role="status">
          <div className="flex items-start justify-between gap-3">
            <b>Подбор обновился после изменений в профиле</b>
            <button className="text-muted" aria-label="Скрыть" onClick={() => setChanges(null)}>×</button>
          </div>
          <ul className="mt-1 space-y-0.5">
            {[...changes.up, ...changes.down].slice(0, 4).map((c) => (
              <li key={c.id}><span translate="no">{c.university}</span>: {FIT_LABEL_NAMES[c.from]} → <b>{FIT_LABEL_NAMES[c.to]}</b></li>
            ))}
          </ul>
          {changes.up.length + changes.down.length > 4 && <p className="mt-1 text-muted">и ещё {changes.up.length + changes.down.length - 4}</p>}
        </div>
      )}

      <div className="tabs-row" role="tablist">
        {(
          [
            ["match", `Подбор (${all.filter((i) => i.fit.admission.label !== "not_eligible").length})`],
            ["mine", `Мой список (${mine.length}${isPro ? "" : `/${limits.myPrograms}`})`],
            ["custom", `Свои вузы (${custom.length})`],
            ["world", "Все вузы мира (10 000+)"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className="chip px-4 py-2.5 text-sm" data-on={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "world" ? (
        <WorldCatalog
          myCountries={profile.targetCountries}
          major={major ?? profile.major}
          onAdd={(p) => saveCustom(p)}
          onManual={(h) => setAdding({ ...emptyCustom(h.name, h.country, h.web, major ?? profile.major), fresh: true } as Program)}
          onOpen={(id) => {
            if (all.some((i) => i.program.id === id)) setDetailId(id);
            else setNote("Эта программа есть в каталоге, но не подходит под твои страны или специальность. Поменяй их в профиле, чтобы увидеть оценку.");
          }}
        />
      ) : (
      <>
      <section className="card space-y-4 p-4 sm:p-5" aria-label="Фильтры">
        {/* На телефоне виден поиск, остальные фильтры — по кнопке */}
        <div className="flex gap-2">
          <input className="input min-w-0 flex-1" placeholder="Поиск по названию или городу" aria-label="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-secondary flex-none px-4 md:hidden" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            Фильтры{activeFilters ? ` · ${activeFilters}` : ""}
          </button>
        </div>
        <div className={`space-y-4 ${showFilters ? "" : "hidden md:block"}`}>
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" aria-label="Специальность" value={major ?? ""} onChange={(e) => setMajor((e.target.value || null) as Major | null)}>
            <option value="">Все мои направления</option>
            {MAJORS.map((m) => <option key={m} value={m}>{t.majors[m]}</option>)}
          </select>
          <input className="input" type="number" min={0} step={1000} placeholder="Макс. стоимость, $/год" aria-label="Максимальная стоимость в год" value={maxCost} onChange={(e) => setMaxCost(e.target.value === "" ? "" : Number(e.target.value))} />
          <select className="input" aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="fit">Сначала лучшее соответствие</option>
            <option value="funding">Сначала с финансированием</option>
            <option value="cost">Сначала дешевле</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presentCountries.map((c) => (
            <button key={c} className="chip px-3 py-1.5 text-sm" data-on={countries.includes(c)} aria-pressed={countries.includes(c)} onClick={() => setCountries(countries.includes(c) ? countries.filter((x) => x !== c) : [...countries, c])}>
              {countryName(c)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className="input w-auto py-2" aria-label="Финансирование" value={funding} onChange={(e) => setFunding(e.target.value as typeof funding)}>
            <option value="any">Любое финансирование</option>
            <option value="some">Есть финансирование</option>
            <option value="full">Только полный грант</option>
          </select>
          <select className="input w-auto py-2" aria-label="Метка поступления" value={label} onChange={(e) => setLabel(e.target.value as typeof label)}>
            <option value="eligible">Все, кроме «не соответствует»</option>
            <option value="all">Все программы</option>
            <option value="high">{FIT_LABEL_NAMES.high}</option>
            <option value="realistic">{FIT_LABEL_NAMES.realistic}</option>
            <option value="ambitious">{FIT_LABEL_NAMES.ambitious}</option>
            <option value="not_eligible">{FIT_LABEL_NAMES.not_eligible}</option>
          </select>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" className="h-4 w-4" checked={backupOnly} onChange={(e) => setBackupOnly(e.target.checked)} />
            Только запасные варианты
          </label>
          <button className="ml-auto font-bold text-primary" onClick={resetFilters}>Сбросить</button>
        </div>
        </div>
      </section>

      <p className="text-sm text-muted">
        Найдено: {filtered.length}
        {tab === "match" && pooled.length > 0 && ` · из них из общей базы вузов: ${filtered.filter((i) => i.program.pooled).length}`}
        {tab === "match" && pool.loading && " · подгружаем вузы из общей базы…"}
        {tab === "match" && !pool.loading && pool.growing && " · база по твоим странам пополняется, новые вузы появятся сами"}
      </p>
      {filtered.length === 0 && (
        <div className="card text-sm text-muted">
          {tab === "mine"
            ? "Добавь программы из подбора — они появятся здесь, на главной и в дорожной карте."
            : tab === "custom"
              ? "Своих вузов пока нет. Нажми «Добавить свой вуз» — найдём его в справочнике из 10 000+ вузов."
              : "Нет программ под фильтры. Попробуй сбросить фильтры."}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((item) => (
          <ProgramCard key={item.program.id} item={item} inList={mine.includes(item.program.id)} onToggle={() => toggleMine(item.program.id)} onOpen={() => setDetailId(item.program.id)} />
        ))}
      </div>
      </>
      )}

      {detail && (
        <Detail
          item={detail}
          canSeeReasons={limits.fitReasons || Boolean(coins.state?.unlocks.fitReasons.includes(detail.program.id))}
          inList={mine.includes(detail.program.id)}
          onToggle={() => toggleMine(detail.program.id)}
          onClose={() => setDetailId(null)}
          onLead={() => setLeadFor(detail)}
          onEdit={() => {
            setAdding(detail.program);
            setDetailId(null);
          }}
          onRemove={() => removeCustom(detail.program.id)}
        />
      )}
      {adding && (
        <AddUniversity
          major={major ?? profile.major}
          initial={adding === true ? undefined : adding}
          onSave={saveCustom}
          onClose={() => setAdding(null)}
          onOpenCatalog={(id) => {
            setAdding(null);
            if (all.some((i) => i.program.id === id)) setDetailId(id);
            else setNote("Этот вуз уже есть в каталоге, но не подходит под выбранную специальность или страны — поменяйте фильтры.");
          }}
        />
      )}
      {leadFor && (
        <LeadModal item={leadFor} profile={profile} profileId={store?.profileId ?? null} contact={store?.contact ?? null} demo={Boolean(store?.demo?.active)} onClose={() => setLeadFor(null)} />
      )}
    </div>
  );
}

function ProgramCard({ item, inList, onToggle, onOpen }: { item: MatchItem; inList: boolean; onToggle: () => void; onOpen: () => void }) {
  const { program: p, fit } = item;
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={onOpen}>
          <h2 className="text-lg font-extrabold hover:text-primary">{p.university}</h2>
          <p className="text-[13px] text-muted">{p.name} · {countryName(p.country)}{p.city ? `, ${p.city}` : ""}</p>
        </button>
        <div className="flex flex-wrap gap-1.5">
          {p.isCustom && <span className="pill bg-line-3 text-muted">{p.aiDraft ? "свой · черновик ИИ" : "свой вуз"}</span>}
          {p.pooled && <span className="pill bg-line-3 text-muted">общая база · собрано ИИ</span>}
          {p.isPartner && <span className="pill border border-line text-muted">партнёр</span>}
          {p.verifiedAt && <span className="pill bg-green-soft text-green">проверено</span>}
        </div>
      </div>
      <FitPills fit={fit} />
      <p className="text-sm text-body">
        ≈ ${totalCost(p).toLocaleString("ru-RU")}/год без гранта · уверенность: {t.confidence[fit.admission.confidence]}
        {fit.admission.unknown.length > 0 && <> · не оценено: {fit.admission.unknown.join(", ")}</>}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button className={inList ? "btn-secondary py-2.5 text-sm" : "btn-primary py-2.5 text-sm"} onClick={onToggle}>{inList ? "Убрать из списка" : "В мой список"}</button>
        <button className="btn-secondary py-2.5 text-sm" onClick={onOpen}>Подробнее</button>
      </div>
    </article>
  );
}

function Detail(props: {
  item: MatchItem; canSeeReasons: boolean; inList: boolean;
  onToggle: () => void; onClose: () => void; onLead: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const { program: p, fit } = props.item;
  const [sent, setSent] = useState<string | null>(null);
  async function suggest() {
    const r = await apiFetch("/api/universities/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ program: p }) }).catch(() => null);
    setSent(r?.ok ? "Отправлено эксперту. После проверки вуз появится в общем каталоге для всех." : "Не удалось отправить. Проверьте, что заполнены сайт (https://…) и страна.");
  }
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-t border-line-3 py-2 text-sm"><span className="text-muted">{k}</span><span className="text-right font-semibold">{v}</span></div>
  );
  const nd = "нет данных";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(10,14,28,.5)]" onClick={props.onClose}>
      <div role="dialog" aria-modal aria-labelledby="detT" className="h-full w-full max-w-[640px] overflow-y-auto bg-surface-solid p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="detT" className="text-2xl font-extrabold">{p.university}</h2>
            <p className="text-sm text-muted">{p.name} · {countryName(p.country)}{p.city ? `, ${p.city}` : ""}</p>
          </div>
          <button className="rounded-lg px-2 py-1 text-xl text-muted" aria-label="Закрыть" onClick={props.onClose}>×</button>
        </div>
        <div className="mt-4"><FitPills fit={fit} /></div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-primary-soft p-4">
            <div className="text-xs font-bold text-primary-ink">ПОСТУПЛЕНИЕ</div>
            <div className="mt-1 text-lg font-extrabold text-primary-ink">{FIT_LABEL_NAMES[fit.admission.label]}</div>
            <div className="text-xs text-body">уверенность: {t.confidence[fit.admission.confidence]}</div>
          </div>
          <div className="rounded-2xl bg-orange-soft p-4">
            <div className="text-xs font-bold text-orange-ink-2">ФИНАНСИРОВАНИЕ</div>
            <div className="mt-1 text-lg font-extrabold text-orange-ink-2">{FUNDING_LABEL_NAMES[fit.funding.label]}</div>
            <div className="text-xs text-body">{p.funding.note || "—"}</div>
          </div>
        </div>

        <h3 className="mt-6 font-extrabold">Почему такая оценка и что усилить</h3>
        {props.canSeeReasons ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
            {[...fit.admission.reasons, ...fit.funding.reasons].map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        ) : (
          <ProGate
            className="mt-2"
            title="Причины оценок — в Pro"
            text="Что именно мешает поступлению и финансированию и что усилить в первую очередь. Можно открыть для этой программы за UniCoins."
            coins="fit_reasons"
            refId={p.id}
            preview={
              <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
                <li>IELTS на уровне типичного профиля поступивших, но ниже желательного для гранта</li>
                <li>GPA выше минимального порога программы</li>
                <li>Финансирование: грант покрывает обучение, проживание — частично</li>
                <li>Сильнее всего заявку поднимут эссе и рекомендации</li>
              </ul>
            }
          />
        )}
        {fit.admission.unknown.length > 0 && <p className="mt-2 text-sm text-muted">Не оценено: {fit.admission.unknown.join(", ")}</p>}

        <h3 className="mt-6 font-extrabold">Требования и стоимость</h3>
        <div className="mt-2">
          {row("Минимальный IELTS", p.requirements.minIelts ?? nd)}
          {row("SAT", p.requirements.satRequired ? "обязателен" : "не обязателен / нет данных")}
          {row("Типичный профиль поступивших", [p.typical.gpa100 ? `GPA ${p.typical.gpa100}` : null, p.typical.ielts ? `IELTS ${p.typical.ielts}` : null, p.typical.sat ? `SAT ${p.typical.sat}` : null].filter(Boolean).join(" · ") || nd)}
          {row("Acceptance rate", p.acceptanceRate != null ? `≈ ${Math.round(p.acceptanceRate * 100)}%` : nd)}
          {row("Обучение", `$${p.tuitionUsd.toLocaleString("ru-RU")}/год`)}
          {row("Проживание", `≈ $${p.livingUsd.toLocaleString("ru-RU")}/год`)}
          {row("Сроки", p.deadlineNote || nd)}
          {row("Данные", p.verifiedAt ? `проверены ${p.verifiedAt.slice(0, 10)}` : p.pooled ? "собрано ИИ, не проверено экспертом — сверить" : p.isCustom ? (p.aiDraft ? "черновик ИИ — сверить" : "введены вами") : "ориентировочно — сверить")}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button className={props.inList ? "btn-secondary" : "btn-primary"} onClick={props.onToggle}>{props.inList ? "Убрать из списка" : "В мой список"}</button>
          {p.url && <a className="btn-secondary" href={p.url} target="_blank" rel="noopener noreferrer">Официальный сайт ↗</a>}
          {p.isLocal && !p.isCustom && <button className="btn-secondary" onClick={props.onLead}>Хочу консультацию</button>}
        </div>
        {p.isCustom && (
          <div className="mt-6 rounded-2xl border border-line p-4">
            <h3 className="font-extrabold">Свой вуз</h3>
            <p className="mt-1 text-sm text-body">Данные собраны автоматически (или введены вами) и не проверены экспертом. Чтобы вуз появился у всех с проверенными цифрами — отправьте его эксперту.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary py-2.5 text-sm" onClick={props.onEdit}>Изменить данные</button>
              <button className="btn-secondary py-2.5 text-sm" onClick={suggest}>Предложить в каталог</button>
              <button className="btn-secondary py-2.5 text-sm text-red" onClick={props.onRemove}>Удалить</button>
            </div>
            {sent && <p className="mt-2 text-sm font-semibold text-primary-ink">{sent}</p>}
          </div>
        )}

        <h3 className="mt-8 text-xl font-extrabold">О вузе</h3>
        <div className="mt-3"><UniDetails uni={{ name: p.university, country: p.country, web: p.url }} compact /></div>
      </div>
    </div>
  );
}

function LeadModal(props: { item: MatchItem; profile: Profile; profileId: string | null; contact: ContactInfo | null; demo: boolean; onClose: () => void }) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const p = props.item.program;
  async function send() {
    if (!props.contact) return setState("error");
    if (props.demo) return setState("done");
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId: p.id, profileId: props.profileId, profile: props.profile, contact: props.contact, consent: true }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
    if (res?.ok) track("lead_submit", { program: p.id });
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(10,14,28,.5)] p-4 sm:items-center" onClick={props.onClose}>
      <div className="w-full max-w-md space-y-4 rounded-[24px] bg-surface-solid p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-labelledby="leadT">
        {state === "done" ? (
          <>
            <h2 id="leadT" className="text-lg font-extrabold">Заявка отправлена</h2>
            <p className="text-sm text-body">{props.demo ? "В демо заявка не отправляется." : `Приёмная комиссия ${p.university} свяжется с тобой по телефону.`}</p>
            <button className="btn-primary w-full" onClick={props.onClose}>Готово</button>
          </>
        ) : (
          <>
            <h2 id="leadT" className="text-lg font-extrabold">Консультация в {p.university}</h2>
            <p className="text-sm text-body">Передадим вузу имя, телефон и краткий профиль. Без этой кнопки вуз твои данные не получает. Оценка и порядок в подборке от оплаты вузов не зависят.</p>
            {!props.contact && <p className="text-sm text-red">В профиле нет контактов — пройди анкету заново.</p>}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Согласен(на) передать мои контакты и профиль в {p.university}</span>
            </label>
            {state === "error" && <p className="text-sm text-red">Не получилось отправить. Попробуй ещё раз.</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={props.onClose}>Отмена</button>
              <button className="btn-primary flex-1" disabled={!consent || state === "sending"} onClick={send}>{state === "sending" ? "Отправляем…" : "Отправить"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
