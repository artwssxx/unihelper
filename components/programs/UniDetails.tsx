"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { t } from "@/lib/i18n/ru";
import { safeLink, type UniProfile, type UniProfileResponse, type UniRef } from "@/lib/uniProfile";

// Полная карточка вуза из общего кеша (собирает ИИ один раз для всех). Используется в «Все вузы мира»
// и в подробностях программы («О вузе»).

const cache = new Map<string, Promise<UniProfileResponse | { error: string }>>();

/** Загрузить профиль вуза (с кешем на время сессии). */
export function loadUniProfile(ref: UniRef): Promise<UniProfileResponse | { error: string }> {
  const key = `${ref.country}:${ref.name}`;
  let p = cache.get(key);
  if (!p) {
    const sp = new URLSearchParams({ name: ref.name, country: ref.country, ...(ref.web ? { web: ref.web } : {}) });
    p = apiFetch(`/api/universities/profile?${sp}`)
      .then(async (r) => (r.ok ? ((await r.json()) as UniProfileResponse) : { error: ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "failed" }))
      .catch(() => ({ error: "failed" }));
    cache.set(key, p);
    p.then((r) => "error" in r && cache.delete(key));
  }
  return p;
}

/** Загрузить профиль; если ИИ перегружен — тихо повторить (до 4 раз с паузой), не показывая ошибку сразу. */
export async function loadUniProfileRetry(ref: UniRef, onRetry?: (n: number) => void, isOff: () => boolean = () => false) {
  for (let n = 0; ; n++) {
    const r = await loadUniProfile(ref);
    if (!("error" in r) || r.error !== "ai_unavailable" || n >= 3 || isOff()) return r;
    onRetry?.(n + 1);
    await new Promise((res) => setTimeout(res, 8000 + n * 6000));
  }
}

export function useUniProfile(ref: UniRef | null) {
  const [state, setState] = useState<{ data: UniProfileResponse | null; error: string | null; loading: boolean; retry: number }>({ data: null, error: null, loading: Boolean(ref), retry: 0 });
  useEffect(() => {
    if (!ref) return;
    let off = false;
    setState({ data: null, error: null, loading: true, retry: 0 });
    loadUniProfileRetry(ref, (n) => !off && setState((s) => ({ ...s, retry: n })), () => off).then(
      (r) => !off && setState("error" in r ? { data: null, error: r.error, loading: false, retry: 0 } : { data: r, error: null, loading: false, retry: 0 }),
    );
    return () => {
      off = true;
    };
  }, [ref?.name, ref?.country]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

const ERR: Record<string, string> = {
  unknown: "Про этот вуз пока мало проверенных данных. Откройте официальный сайт — там требования и стоимость.",
  ai_unavailable: "Не получилось собрать данные — ИИ сейчас перегружен. Попробуйте через минуту.",
  login_required: "Войдите, чтобы собрать карточку вуза.",
};

const money = (v: number | null) => (v == null ? "нет данных" : `$${v.toLocaleString("ru-RU")}`);

/** Содержимое карточки. compact — блок «О вузе» внутри подробностей программы. */
export default function UniDetails({ uni, compact = false }: { uni: UniRef; compact?: boolean }) {
  const { data, error, loading, retry } = useUniProfile(uni);
  if (loading) {
    return (
      <div className="space-y-3" role="status">
        <p className="text-sm text-muted">{retry ? "Сервис ИИ сейчас занят — пробуем ещё раз, это займёт ещё немного времени…" : "Собираем данные о вузе — до 30 секунд, один раз для всех учеников…"}</p>
        {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-line-3" />)}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-2 text-sm">
        <p className="rounded-xl bg-orange-soft px-3 py-2 font-semibold text-orange-ink-2">{ERR[error ?? ""] ?? ERR.ai_unavailable}</p>
        {safeLink(uni.web) && <a href={uni.web!} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-primary">Официальный сайт ↗</a>}
      </div>
    );
  }
  const p: UniProfile = data.profile;
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-t border-line-3 py-2 text-sm first:border-0"><span className="text-muted">{k}</span><span className="text-right font-semibold">{v}</span></div>
  );
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-line-3 px-3 py-2 text-xs text-muted">
        Собрано ИИ {new Date(data.updatedAt).toLocaleDateString("ru-RU")}, не проверено экспертом{p.confidence === "low" ? " · уверенность низкая" : ""}. Цифры и сроки сверьте на официальном сайте.
      </p>
      <p className="text-body" translate="no">{p.summary}</p>

      <Section title="Коротко">
        {row("Страна, город", `${countryName(uni.country)}${p.city ? `, ${p.city}` : ""}`)}
        {p.type && row("Тип", p.type === "public" ? "государственный" : "частный")}
        {p.qsRank && row("QS World Ranking", `#${p.qsRank}`)}
        {p.theRank && row("Times Higher Education", `#${p.theRank}`)}
        {p.acceptanceRate != null && row("Принимают", `≈ ${Math.round(p.acceptanceRate * 100)}% заявок`)}
        {p.students && row("Студентов", `≈ ${p.students.toLocaleString("ru-RU")}`)}
        {p.languages.length > 0 && row("Язык обучения", <span translate="no">{p.languages.join(", ")}</span>)}
      </Section>

      <Section title="Стоимость в год">
        {row("Обучение для иностранцев", money(p.tuitionUsd))}
        {row("Проживание и жизнь", money(p.livingUsd))}
        {p.applicationFeeUsd != null && row("Сбор за заявку", money(p.applicationFeeUsd))}
      </Section>

      <Section title="Требования">
        {row("IELTS", p.requirements.minIelts ? `от ${p.requirements.minIelts}` : "нет данных")}
        {p.requirements.minToefl && row("TOEFL iBT", `от ${p.requirements.minToefl}`)}
        {row("SAT", p.requirements.satPolicy === "required" ? "обязателен" : p.requirements.satPolicy === "optional" ? "по желанию" : p.requirements.satPolicy === "not_considered" ? "не нужен" : "нет данных")}
        {(p.typical.ielts || p.typical.sat || p.typical.gpa100) && row("Типично у поступивших", [p.typical.ielts && `IELTS ${p.typical.ielts}`, p.typical.sat && `SAT ${p.typical.sat}`, p.typical.gpa100 && `GPA ${p.typical.gpa100}/100`].filter(Boolean).join(" · "))}
        {p.requirements.documents.length > 0 && <List items={p.requirements.documents} />}
      </Section>

      {!compact || p.scholarships.length ? (
        <Section title="Гранты и стипендии">
          {p.scholarships.length ? (
            <ul className="space-y-2">
              {p.scholarships.map((s, i) => (
                <li key={i} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b translate="no">{s.name}</b>
                    <span className={`pill ${s.type === "full" ? "bg-green-soft text-green" : "bg-primary-soft text-primary-ink"}`}>{s.type === "full" ? "полная" : "частичная"}</span>
                  </div>
                  <p className="mt-1 text-body" translate="no">{s.coverage}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.basis === "need" ? "по финансовой ситуации" : s.basis === "merit" ? "за успехи" : "государственная"}
                    {s.forUzbekistan === true ? " · доступна гражданам Узбекистана" : s.forUzbekistan === false ? " · недоступна гражданам Узбекистана" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Известных стипендий для иностранцев нет — проверьте раздел финансирования на сайте вуза.</p>
          )}
        </Section>
      ) : null}

      <Section title="Сроки">
        {p.intakes.length > 0 && row("Начало учёбы", <span translate="no">{p.intakes.join(", ")}</span>)}
        {p.deadlines.length ? p.deadlines.map((d, i) => <div key={i}>{row(d.round, d.date)}</div>) : <p className="text-sm text-muted">Сроки сверьте на официальном сайте.</p>}
      </Section>

      <Section title="Как подавать">
        {p.howToApply.platform && row("Платформа", <span translate="no">{p.howToApply.platform}</span>)}
        {p.howToApply.steps.length > 0 && <List items={p.howToApply.steps} ordered />}
      </Section>

      {p.strongMajors.length > 0 && (
        <Section title="Сильные направления">
          <div className="flex flex-wrap gap-1.5" translate="no">
            {p.strongMajors.map((m) => <span key={m} className="pill bg-line-3 text-body">{m}</span>)}
          </div>
          {p.majorsOffered.length > 0 && <p className="mt-2 text-xs text-muted">Есть твои направления: {p.majorsOffered.map((m) => t.majors[m]).join(", ")}</p>}
        </Section>
      )}

      {(p.links.length > 0 || safeLink(p.website)) && (
        <Section title="Официальные страницы">
          <div className="flex flex-wrap gap-2">
            {safeLink(p.website) && <a href={p.website!} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary py-2 text-sm">Сайт вуза ↗</a>}
            {p.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary py-2 text-sm" translate="no">{l.label} ↗</a>
            ))}
          </div>
        </Section>
      )}
      {p.caveats && <p className="text-xs text-muted" translate="no">Проверить: {p.caveats}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-extrabold tracking-[0.14em] text-muted">{title.toUpperCase()}</h3>
      <div>{children}</div>
    </section>
  );
}

function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`mt-1 space-y-1 pl-5 text-sm text-body ${ordered ? "list-decimal" : "list-disc"}`} translate="no">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </Tag>
  );
}
