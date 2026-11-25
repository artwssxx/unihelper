"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Check } from "@/components/icons";
import { track } from "@/lib/analytics";
import { update, useStore } from "@/lib/clientStore";
import { rankOnlineEvents, SOURCE_LABEL, type OnlineEvent } from "@/lib/onlineEvents";

type Kind = "all" | "hackathon" | "contest" | "other";
const KINDS: [Kind, string][] = [["all", "Все"], ["hackathon", "Хакатоны"], ["contest", "Соревнования"], ["other", "Вебинары и школы"]];
let cache: { at: number; items: OnlineEvent[] } | null = null;

/** Онлайн-ивенты, подобранные под направления, класс и портфолио ученика. Пересчитываются при изменении профиля. */
export default function OnlineForYou() {
  const store = useStore();
  const profile = store?.profile;
  const [items, setItems] = useState<OnlineEvent[] | null>(cache && Date.now() - cache.at < 15 * 60_000 ? cache.items : null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<Kind>("all");
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (items) return;
    fetch("/api/events/online")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        cache = { at: Date.now(), items: j.items ?? [] };
        setItems(cache.items);
      })
      .catch(() => setFailed(true));
  }, [items]);

  const ranked = useMemo(() => (profile && items ? rankOnlineEvents(items, profile) : []), [profile, items]);
  if (!profile) return null;
  const list = ranked.filter((e) => kind === "all" || (kind === "other" ? e.kind !== "hackathon" && e.kind !== "contest" : e.kind === kind));
  const shown = list.slice(0, more ? 18 : 6);
  const planned = new Set((store?.customSteps ?? []).map((s) => s.id));

  const addToPlan = (e: OnlineEvent) => {
    const id = `ev-${e.id}`;
    if (planned.has(id)) return;
    update((s) => ({ customSteps: [...(s.customSteps ?? []), { id, title: `Участвовать: ${e.title}`, month: e.startsAt.slice(0, 7), track: "activities" }] }));
    track("online_event_plan", { source: e.source });
  };

  return (
    <section className="space-y-4" aria-labelledby="onlineT">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">ПОДОБРАНО ДЛЯ ТЕБЯ · ОНЛАЙН</div>
          <h2 id="onlineT" className="mt-2 text-2xl font-extrabold">Онлайн-ивенты по твоим направлениям</h2>
          <p className="mt-1 max-w-[680px] text-sm text-body">Хакатоны, соревнования и вебинары, в которых можно участвовать из Узбекистана. Подбор обновляется сам, когда меняются направления, класс или активности в профиле.</p>
        </div>
        <div className="tabs-row" role="tablist">
          {KINDS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={kind === k} className="chip px-3.5 py-2 text-sm" data-on={kind === k} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
      </div>

      {!items && !failed && (
        <div className="grid gap-3 md:grid-cols-2" aria-busy>
          {[0, 1, 2, 3].map((i) => <div key={i} className="card h-36 animate-pulse bg-line-3" />)}
        </div>
      )}
      {failed && <p className="card text-sm text-muted">Не удалось загрузить онлайн-ивенты. Обнови страницу чуть позже.</p>}
      {items && !list.length && <p className="card text-sm text-muted">Сейчас нет онлайн-ивентов под твои направления. Загляни через пару дней — источники обновляются каждые несколько часов.</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((e) => {
          const d = new Date(e.startsAt);
          const started = d.getTime() < Date.now();
          const inPlan = planned.has(`ev-${e.id}`);
          const external = !e.url.startsWith("/");
          return (
            <article key={e.id} className="card flex gap-4">
              <div className="flex h-14 w-[52px] flex-none flex-col items-center justify-center rounded-xl bg-orange-soft text-orange-ink-2">
                <span className="text-lg font-extrabold">{String(d.getDate()).padStart(2, "0")}</span>
                <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="pill bg-bg text-muted">{e.kind === "hackathon" ? "Хакатон" : e.kind === "contest" ? "Соревнование" : e.kind === "webinar" ? "Вебинар" : "Онлайн"}</span>
                  <span className="pill bg-bg text-muted">{SOURCE_LABEL[e.source]}</span>
                  {started && <span className="pill bg-green-soft text-green">идёт сейчас</span>}
                </div>
                <h3 className="mt-2 text-[17px] font-extrabold leading-snug" translate="no">{e.title}</h3>
                <p className="text-[13px] text-muted"><span translate="no">{e.organizer}</span>{e.note && <> · <span>{e.note}</span></>}</p>
                {e.reasons.length > 0 && <p className="mt-1.5 text-[13px] font-semibold text-primary-ink">{e.reasons.slice(0, 3).join(" · ")}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn-primary py-2 text-sm" href={e.url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={() => track("online_event_open", { source: e.source })}>
                    {external ? "Открыть сайт" : "Подробнее"}
                  </a>
                  <button className="btn-secondary py-2 text-sm" disabled={inPlan} onClick={() => addToPlan(e)}>
                    {inPlan ? <><Check size={16} /> В плане</> : <><Calendar size={16} /> В мой план</>}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {list.length > shown.length && <button className="btn-secondary" onClick={() => setMore(true)}>Показать ещё ({list.length - shown.length})</button>}
      <p className="text-xs text-muted">Источники: Devpost, Codeforces, CodeChef и лента UniHelper. Даты и условия — от организаторов; возраст и правила участия проверь на сайте ивента.</p>
    </section>
  );
}
