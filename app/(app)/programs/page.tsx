"use client";

import { useMemo, useState } from "react";
import FitPills from "@/components/FitPills";
import NeedProfile from "@/components/NeedProfile";
import { PROGRAMS } from "@/data/programs";
import { update } from "@/lib/clientStore";
import { t } from "@/lib/i18n/ru";
import type { ContactInfo } from "@/lib/profileSchema";
import { totalCost } from "@/lib/scoring/fit";
import { matchPrograms, type MatchItem } from "@/lib/scoring/match";
import type { Profile } from "@/lib/types";
import { useProfile } from "@/lib/useProfile";

type Tab = "mine" | "abroad" | "local";

export default function ProgramsPage() {
  const { profile, store } = useProfile();
  const [tab, setTab] = useState<Tab | null>(null);
  const [leadFor, setLeadFor] = useState<MatchItem | null>(null);
  const match = useMemo(() => (profile ? matchPrograms(profile, PROGRAMS) : null), [profile]);

  if (profile === undefined) return null;
  if (profile === null || !match) return <NeedProfile text="Подборка программ считается по твоему профилю." />;

  const mine = store?.myPrograms ?? [];
  const all = [...match.abroad, ...match.local];
  const activeTab: Tab = tab ?? (mine.length ? "mine" : "abroad");
  const list = activeTab === "mine" ? all.filter((i) => mine.includes(i.program.id)) : activeTab === "abroad" ? match.abroad : match.local;
  const toggleMine = (id: string) => update((s) => ({ myPrograms: (s.myPrograms ?? []).includes(id) ? (s.myPrograms ?? []).filter((x) => x !== id) : [...(s.myPrograms ?? []), id] }));

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ПРОГРАММЫ И ГРАНТЫ</div>
        <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">Мои программы</h1>
        <p className="mt-2 max-w-[700px] text-body">
          Две отдельные оценки: поступление (Admission Fit) и финансирование (Funding Fit). Процентов «шансов» нет намеренно. Партнёрство вуза на метки и порядок не влияет.
        </p>
      </section>

      {!match.hasBackup && (
        <p className="rounded-2xl bg-orange-soft px-5 py-3 text-sm font-semibold text-[#8A3613]">
          В подборке нет запасного варианта — программы, куда ты проходишь и которую семья может оплатить без гранта. Посмотри вкладку «В Узбекистане» или пересмотри бюджет в профиле.
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="tablist">
        {([["mine", `Мой список (${mine.length})`], ["abroad", `За рубежом (${match.abroad.length})`], ["local", `В Узбекистане (${match.local.length})`]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={activeTab === k} className="chip px-4 py-2.5 text-sm" data-on={activeTab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card text-sm text-muted">{activeTab === "mine" ? "Добавь программы из подборки — они появятся здесь, на главной и в дорожной карте." : "Нет программ под выбранные страны и специальность."}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((item) => (
          <ProgramCard key={item.program.id} item={item} inList={mine.includes(item.program.id)} onToggle={() => toggleMine(item.program.id)} onLead={() => setLeadFor(item)} />
        ))}
      </div>

      {leadFor && <LeadModal item={leadFor} profile={profile} profileId={store?.profileId ?? null} contact={store?.contact ?? null} onClose={() => setLeadFor(null)} />}
    </div>
  );
}

function ProgramCard({ item, inList, onToggle, onLead }: { item: MatchItem; inList: boolean; onToggle: () => void; onLead: () => void }) {
  const { program: p, fit } = item;
  const [open, setOpen] = useState(false);
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{p.university}</h2>
          <p className="text-[13px] text-muted">{p.name} · {t.countries[p.country]}, {p.city}</p>
        </div>
        {p.isPartner && <span className="pill border border-line text-muted">партнёр</span>}
      </div>
      <FitPills fit={fit} />
      <p className="text-sm text-body">
        Стоимость без гранта ≈ ${totalCost(p).toLocaleString("ru-RU")}/год · уверенность: {t.confidence[fit.admission.confidence]}
        {fit.admission.unknown.length > 0 && <> · не оценено: {fit.admission.unknown.join(", ")}</>}
      </p>
      {open && (
        <div className="space-y-2 rounded-2xl bg-bg p-4 text-sm">
          <ul className="list-disc space-y-1 pl-5">{[...fit.admission.reasons, ...fit.funding.reasons].map((r, i) => <li key={i}>{r}</li>)}</ul>
          <p className="text-muted">Сроки: {p.deadlineNote}</p>
          {!p.verifiedAt && <p className="text-muted">Данные ориентировочные и ещё не проверены экспертом — сверяйте даты и суммы на официальном сайте.</p>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button className={inList ? "btn-secondary py-2.5 text-sm" : "btn-primary py-2.5 text-sm"} onClick={onToggle}>{inList ? "Убрать из списка" : "В мой список"}</button>
        <button className="btn-secondary py-2.5 text-sm" onClick={() => setOpen(!open)}>{open ? "Скрыть причины" : "Почему такая оценка?"}</button>
        {p.url && <a className="btn-secondary py-2.5 text-sm" href={p.url} target="_blank" rel="noopener noreferrer">Сайт ↗</a>}
        {p.isLocal && <button className="btn-secondary py-2.5 text-sm" onClick={onLead}>Хочу консультацию</button>}
      </div>
    </article>
  );
}

function LeadModal(props: { item: MatchItem; profile: Profile; profileId: string | null; contact: ContactInfo | null; onClose: () => void }) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const p = props.item.program;
  async function send() {
    if (!props.contact) return setState("error");
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId: p.id, profileId: props.profileId, profile: props.profile, contact: props.contact, consent: true }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={props.onClose}>
      <div className="card w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-labelledby="leadT">
        {state === "done" ? (
          <>
            <h2 id="leadT" className="text-lg font-extrabold">Заявка отправлена</h2>
            <p className="text-sm text-body">Приёмная комиссия {p.university} свяжется с тобой по телефону.</p>
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
