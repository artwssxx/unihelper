"use client";

import Link from "next/link";
import { useMemo } from "react";
import FitPills from "@/components/FitPills";
import MockTrend from "@/components/MockTrend";
import NeedProfile from "@/components/NeedProfile";
import StrengthCard from "@/components/StrengthCard";
import { update } from "@/lib/clientStore";
import { buildRoadmap, effectiveStatus } from "@/lib/roadmap";
import { t } from "@/lib/i18n/ru";
import { matchPrograms } from "@/lib/scoring/match";
import { scoreProfile } from "@/lib/scoring/strength";
import { lessonsForDomainsIn, useContent } from "@/lib/useContent";
import { useProfile } from "@/lib/useProfile";

export default function Dashboard() {
  const { profile, store } = useProfile();
  const { programs: PROGRAMS, events: EVENTS, lessons: LESSONS } = useContent();
  const data = useMemo(() => {
    if (!profile || !store) return null;
    const strength = scoreProfile(profile);
    const match = matchPrograms(profile, PROGRAMS);
    const all = [...match.abroad, ...match.local];
    const mine = (store.myPrograms ?? []).map((id) => all.find((i) => i.program.id === id)).filter(Boolean) as typeof all;
    // Нет своего списка — показываем по одной: реалистичная за рубежом, амбициозная, запасной вариант.
    const picks = mine.length
      ? mine.slice(0, 3)
      : [match.abroad.find((i) => i.fit.admission.label === "realistic"), match.abroad.find((i) => i.fit.admission.label === "ambitious"), all.find((i) => i.fit.isBackup)].filter(Boolean) as typeof all;
    const roadmap = buildRoadmap(profile, store.myPrograms ?? [], new Date(), PROGRAMS);
    const steps = roadmap
      .map((i) => ({ i, st: effectiveStatus(i, store.roadmap?.[i.id]) }))
      .filter((x) => x.st !== "done")
      .slice(0, 4);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const weekCount = roadmap.filter((i) => i.due.startsWith(thisMonth) && effectiveStatus(i, store.roadmap?.[i.id]) !== "done").length;
    const myEvents = Object.entries(store.events ?? {}).filter(([, r]) => r.status !== "cancelled").map(([id]) => EVENTS.find((e) => e.id === id)).filter(Boolean);
    const upcoming = (myEvents.length ? myEvents : EVENTS.filter((e) => e.registrationMode === "unihelper")).slice(0, 2);
    const lastMock = [...(store.mocks ?? [])].filter((m) => m.status === "completed").sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
    const weak = lastMock?.weakDomains?.[0];
    return { strength, picks, steps, weekCount, upcoming, myEventIds: new Set(myEvents.map((e) => e!.id)), weak, lessons: weak ? lessonsForDomainsIn(LESSONS, [weak], 1) : [] };
  }, [profile, store, PROGRAMS, EVENTS, LESSONS]);

  if (profile === undefined) return null;
  if (profile === null || !data) return <NeedProfile />;

  const first = store?.contact?.fullName?.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const top = data.steps[0]?.i;

  return (
    <div>
      <section className="flex flex-wrap gap-6">
        <div className="min-w-0 flex-[1_1_300px] pt-2">
          <div className="eyebrow">{today}</div>
          <h1 className="mt-3.5 text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">{hello}{first ? `, ${first}` : ""}!</h1>
          <p className="mt-3.5 max-w-[420px] text-base leading-relaxed text-body">
            {data.weekCount > 0 ? `В этом месяце ${data.weekCount} шаг${data.weekCount === 1 ? "" : data.weekCount < 5 ? "а" : "ов"} по плану.` : "На этот месяц шагов по плану нет."}
            {top ? ` Самый важный — «${top.title}».` : ""}
          </p>
          <div className="mt-[22px] flex flex-wrap gap-2.5">
            <Link href={top?.link ?? "/mocks"} className="btn-primary">{top?.link === "/mocks" ? "Начать мок" : "Сделать шаг"}</Link>
            <Link href="/roadmap" className="btn-secondary">Открыть карту</Link>
          </div>
        </div>
        <StrengthCard s={data.strength} className="flex-[1.4_1_460px]" />
      </section>

      <section className="mt-6 grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <div className="card min-w-0 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-xl font-extrabold">Мои программы</h2>
            <Link href="/programs" className="text-sm font-bold text-primary">Подобрать ещё</Link>
          </div>
          <div className="mt-4 flex flex-col">
            {data.picks.length === 0 && <p className="text-sm text-muted">Нет программ под выбранные страны.</p>}
            {data.picks.map((i) => (
              <div key={i.program.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-3 py-3.5">
                <div className="min-w-0">
                  <div className="font-extrabold">{i.program.university}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{t.countries[i.program.country]} · {i.program.name}</div>
                </div>
                <FitPills fit={i.fit} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="m-0 text-xl font-extrabold">Следующие шаги</h2>
          <div className="mt-4 flex flex-col gap-3.5">
            {data.steps.map(({ i, st }) => (
              <label key={i.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 flex-none accent-[var(--pri)]"
                  checked={false}
                  onChange={() => update((s) => ({ roadmap: { ...(s.roadmap ?? {}), [i.id]: "done" } }))}
                />
                <span>
                  <span className="font-bold">{i.title}</span>
                  <br />
                  <span className={`text-[13px] ${st === "overdue" ? "font-bold text-orange-ink" : "text-muted"}`}>
                    {st === "overdue" ? "просрочено" : `срок — ${new Date(i.due).toLocaleDateString("ru-RU", { month: "long" })}`}
                    {i.estimated ? " · ориентировочно" : ""}
                  </span>
                </span>
              </label>
            ))}
            {data.steps.length === 0 && <p className="text-sm text-muted">Все шаги выполнены.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xl font-extrabold">SAT по мокам</h2>
            <span className="pill bg-bg text-muted">примерно</span>
          </div>
          <MockTrend history={store?.mocks ?? []} compact />
          {data.weak && (
            <p className="mt-3 text-[13px] text-muted">
              Слабая тема: {data.weak}
              {data.lessons[0] && <> → <Link href={`/lessons/${data.lessons[0].id}`} className="font-bold text-primary">урок</Link></>}
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xl font-extrabold">Ивенты</h2>
            <Link href="/events" className="text-sm font-bold text-primary">Все</Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {data.upcoming.map((e) => {
              const d = new Date(e!.startsAt);
              return (
                <div key={e!.id} className="flex items-center gap-3.5">
                  <div className={`flex h-14 w-[52px] flex-none flex-col items-center justify-center rounded-xl ${e!.online ? "bg-orange-soft text-orange-ink-2" : "bg-primary-soft text-primary-ink"}`}>
                    <span className="text-lg font-extrabold">{String(d.getDate()).padStart(2, "0")}</span>
                    <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "")}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">{e!.title}</div>
                    <div className="text-[13px] text-muted">
                      {e!.location} ·{" "}
                      {data.myEventIds.has(e!.id) ? <span className="font-bold text-green">вы записаны</span> : `${Math.max(0, e!.capacity - e!.registered)} мест осталось`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-inv bg-inv p-6 text-white">
          <h2 className="m-0 text-xl font-extrabold">AI Advisor</h2>
          <p className="mb-4 mt-2.5 text-sm leading-relaxed text-navy-text">Спроси про программы, гранты или эссе — отвечаю с учётом твоего профиля.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/assistant?q=${encodeURIComponent("Хватит ли мне IELTS 6.5?")}`} className="rounded-full border border-navy-line bg-navy-2 px-3 py-2 text-[13px] font-semibold">Хватит ли мне IELTS 6.5?</Link>
            <Link href="/essays" className="rounded-full border border-navy-line bg-navy-2 px-3 py-2 text-[13px] font-semibold">Проверь моё эссе</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
