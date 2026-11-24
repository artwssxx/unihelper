"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PROGRAMS } from "@/data/programs";
import { load } from "@/lib/clientStore";
import { t } from "@/lib/i18n/ru";
import type { ContactInfo } from "@/lib/profileSchema";
import { FIT_LABEL_NAMES, FUNDING_LABEL_NAMES, totalCost } from "@/lib/scoring/fit";
import { matchPrograms, type MatchItem } from "@/lib/scoring/match";
import { LEVEL_NAMES, scoreProfile } from "@/lib/scoring/strength";
import type { FitLabel, FundingLabel, Profile } from "@/lib/types";

const FIT_STYLE: Record<FitLabel, string> = {
  not_eligible: "bg-danger-soft text-danger",
  ambitious: "bg-warn-soft text-warn",
  realistic: "bg-info-soft text-info",
  high: "bg-ok-soft text-ok",
};
const FUNDING_STYLE: Record<FundingLabel, string> = {
  none: "bg-danger-soft text-danger",
  low: "bg-warn-soft text-warn",
  medium: "bg-info-soft text-info",
  high: "bg-ok-soft text-ok",
  self_funded: "bg-ok-soft text-ok",
};

type Tip = { title: string; action: string };

export default function Result() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"abroad" | "local">("abroad");
  const [tips, setTips] = useState<{ items: Tip[]; source: string } | null>(null);
  const [leadFor, setLeadFor] = useState<MatchItem | null>(null);

  useEffect(() => {
    const s = load();
    setProfile(s.profile ?? null);
    setContact(s.contact ?? null);
    setProfileId(s.profileId ?? null);
    setReady(true);
  }, []);

  const strength = useMemo(() => (profile ? scoreProfile(profile) : null), [profile]);
  const match = useMemo(() => (profile ? matchPrograms(profile, PROGRAMS) : null), [profile]);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    fetch("/api/advice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, profileId }),
    })
      .then((r) => r.json())
      .then((j) => alive && setTips({ items: j.tips ?? [], source: j.source }))
      .catch(() => alive && setTips({ items: [], source: "error" }));
    return () => {
      alive = false;
    };
  }, [profile, profileId]);

  if (!ready) return null;
  if (!profile || !strength || !match) {
    return (
      <div className="card mt-6 space-y-4 text-center">
        <p>Сначала пройди короткую анкету — это 3 минуты.</p>
        <Link href="/quiz" className="btn-primary">Пройти оценку</Link>
      </div>
    );
  }

  const list = tab === "abroad" ? match.abroad : match.local;

  return (
    <div className="space-y-8 pt-2">
      <section className="card space-y-5">
        <div>
          <p className="text-sm text-muted">Profile Strength — сила профиля, не зависит от вуза</p>
          <h1 className="text-3xl font-bold capitalize">{LEVEL_NAMES[strength.overall]}</h1>
        </div>
        <ul className="space-y-3">
          {strength.axes.map((a) => (
            <li key={a.axis} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-medium">{t.axes[a.axis]}</span>
                <span className="text-muted">{a.level == null ? "не оценено" : LEVEL_NAMES[a.level]}</span>
              </div>
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${a.level != null && i <= a.level ? "bg-accent" : a.level == null ? "bg-border opacity-40" : "bg-border"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">{a.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Что улучшить за 3 месяца</h2>
        {!tips ? (
          <div className="card text-sm text-muted">Готовим советы…</div>
        ) : (
          <ol className="space-y-3">
            {tips.items.map((tip, i) => (
              <li key={i} className="card flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent">{i + 1}</span>
                <div>
                  <p className="font-semibold">{tip.title}</p>
                  {tip.action && <p className="text-sm text-muted">{tip.action}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Подборка программ и грантов</h2>
          <p className="text-sm text-muted">
            Две отдельные оценки: Admission Fit — подходишь ли программе, Funding Fit — реально ли получить деньги. Процентов «шансов» нет намеренно.
          </p>
        </div>
        {!match.hasBackup && (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            В списке пока нет запасного варианта — программы, куда ты проходишь и которую семья может оплатить без гранта. Посмотри узбекские вузы или пересмотри бюджет.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-border p-1">
          {(["abroad", "local"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-surface text-fg" : "text-muted"}`}
            >
              {k === "abroad" ? `За рубежом (${match.abroad.length})` : `В Узбекистане (${match.local.length})`}
            </button>
          ))}
        </div>
        {list.length === 0 && <div className="card text-sm text-muted">Нет программ под выбранные страны и специальность.</div>}
        <div className="space-y-4">
          {list.map((item) => (
            <ProgramCard key={item.program.id} item={item} onLead={() => setLeadFor(item)} />
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">Есть вопросы про программы, эссе или документы?</p>
        <Link href="/chat" className="btn-primary">Спросить ИИ-помощника</Link>
      </section>

      {leadFor && (
        <LeadModal item={leadFor} profile={profile} profileId={profileId} contact={contact} onClose={() => setLeadFor(null)} />
      )}
    </div>
  );
}

function ProgramCard({ item, onLead }: { item: MatchItem; onLead: () => void }) {
  const { program: p, fit } = item;
  const [open, setOpen] = useState(false);
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{p.university}</h3>
          <p className="text-sm text-muted">{p.name} · {p.city}</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {fit.isBackup && <span className="rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent">запасной вариант</span>}
          {p.isPartner && <span className="rounded-full border border-border px-2 py-1 text-muted">партнёр</span>}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className={`rounded-xl px-3 py-2 ${FIT_STYLE[fit.admission.label]}`}>
          <p className="text-xs opacity-80">Admission Fit</p>
          <p className="font-semibold">{FIT_LABEL_NAMES[fit.admission.label]}</p>
        </div>
        <div className={`rounded-xl px-3 py-2 ${FUNDING_STYLE[fit.funding.label]}`}>
          <p className="text-xs opacity-80">Funding Fit</p>
          <p className="font-semibold">{FUNDING_LABEL_NAMES[fit.funding.label]}</p>
        </div>
      </div>
      <p className="text-sm text-muted">
        Стоимость без гранта ≈ ${totalCost(p).toLocaleString("ru-RU")}/год · Уверенность: {t.confidence[fit.admission.confidence]}
      </p>
      <button className="text-sm font-medium text-accent" onClick={() => setOpen(!open)}>
        {open ? "Скрыть причины" : "Почему такая оценка?"}
      </button>
      {open && (
        <div className="space-y-2 text-sm">
          <ul className="list-disc space-y-1 pl-5">
            {[...fit.admission.reasons, ...fit.funding.reasons].map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {fit.admission.unknown.length > 0 && <p className="text-muted">Не оценено: {fit.admission.unknown.join(", ")}</p>}
          <p className="text-muted">Сроки: {p.deadlineNote}</p>
        </div>
      )}
      {!p.verifiedAt && (
        <p className="rounded-lg bg-bg px-3 py-2 text-xs text-muted">
          Данные ориентировочные и ещё не проверены экспертом. Даты и суммы сверяйте на официальном сайте.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-ghost py-2 text-sm">Официальный сайт</a>
        )}
        {p.isLocal && <button onClick={onLead} className="btn-primary py-2 text-sm">Хочу консультацию</button>}
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
      body: JSON.stringify({
        programId: p.id,
        profileId: props.profileId,
        profile: props.profile,
        contact: props.contact,
        consent: true,
      }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={props.onClose}>
      <div className="card w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {state === "done" ? (
          <>
            <h2 className="text-lg font-bold">Заявка отправлена</h2>
            <p className="text-sm text-muted">Приёмная комиссия {p.university} свяжется с тобой по телефону.</p>
            <button className="btn-primary w-full" onClick={props.onClose}>Готово</button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">Консультация в {p.university}</h2>
            <p className="text-sm text-muted">
              Мы передадим вузу твоё имя, телефон и краткий профиль. Без этой кнопки вуз твои данные не получает. Оценка и порядок в подборке от оплаты вузов не зависят.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Согласен(на) передать мои контакты и профиль в {p.university}</span>
            </label>
            {state === "error" && <p className="text-sm text-danger">Не получилось отправить. Попробуй ещё раз.</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={props.onClose}>Отмена</button>
              <button className="btn-primary flex-1" disabled={!consent || state === "sending"} onClick={send}>
                {state === "sending" ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
