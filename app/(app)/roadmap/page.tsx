"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import NeedProfile from "@/components/NeedProfile";
import { update } from "@/lib/clientStore";
import { TRACKS, buildRoadmap, effectiveStatus, monthLabel, type RoadmapItem, type StepStatus, type Track } from "@/lib/roadmap";
import { useProfile } from "@/lib/useProfile";

const STATUS: Record<StepStatus, { label: string; cls: string }> = {
  todo: { label: "не начат", cls: "bg-bg text-muted" },
  doing: { label: "в работе", cls: "bg-primary-soft text-primary-ink" },
  done: { label: "готово", cls: "bg-green-soft text-green" },
  overdue: { label: "просрочено", cls: "bg-orange-soft text-orange-ink-2" },
};
const NEXT: Record<StepStatus, "todo" | "doing" | "done"> = { todo: "doing", doing: "done", done: "todo", overdue: "doing" };

export default function RoadmapPage() {
  const { profile, store } = useProfile();
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<Track>("activities");
  const [month, setMonth] = useState("");

  const items: RoadmapItem[] = useMemo(() => {
    if (!profile) return [];
    const auto = buildRoadmap(profile, store?.myPrograms ?? []);
    const manual = (store?.customSteps ?? []).map((c) => ({ id: c.id, title: c.title, track: c.track as Track, due: c.month, estimated: false, source: "manual" as const }));
    return [...auto, ...manual].sort((a, b) => a.due.localeCompare(b.due));
  }, [profile, store]);

  if (profile === undefined) return null;
  if (profile === null) return <NeedProfile text="Дорожная карта строится из класса, целей и силы профиля." />;

  const months = [...new Set(items.map((i) => i.due))];
  const status = (i: RoadmapItem) => effectiveStatus(i, store?.roadmap?.[i.id]);
  const toggle = (i: RoadmapItem) => update((s) => ({ roadmap: { ...(s.roadmap ?? {}), [i.id]: NEXT[status(i)] } }));
  const doneCount = items.filter((i) => status(i) === "done").length;

  function addStep() {
    if (!title.trim() || !month) return;
    update((s) => ({ customSteps: [...(s.customSteps ?? []), { id: `c-${Date.now()}`, title: title.trim().slice(0, 120), month: `${month}-01`, track }] }));
    setTitle("");
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">ДОРОЖНАЯ КАРТА</div>
          <h1 className="mt-3 text-[34px] font-extrabold tracking-tight sm:text-[42px]">План до поступления</h1>
          <p className="mt-2 max-w-[640px] text-body">
            Строится из твоего класса, целей и Profile Strength по шаблонам эксперта. Сроки заявок — ориентировочно, по прошлому году: сверяйте на официальных сайтах.
          </p>
        </div>
        <div className="card py-4">
          <div className="lbl">ГОТОВО</div>
          <div className="mt-1 text-2xl font-extrabold">{doneCount} / {items.length}</div>
        </div>
      </section>

      {/* Десктоп: шкала по месяцам с 4 дорожками */}
      <section className="hidden overflow-x-auto rounded-[22px] border border-line bg-surface md:block" aria-label="Дорожная карта по месяцам">
        <div className="grid min-w-max" style={{ gridTemplateColumns: `140px repeat(${months.length}, 220px)` }}>
          <div className="sticky left-0 z-10 border-b border-r border-line bg-surface" />
          {months.map((m) => (
            <div key={m} className="border-b border-line px-4 py-3 text-sm font-extrabold capitalize">{monthLabel(m)}</div>
          ))}
          {TRACKS.map((t) => (
            <Lane key={t.id} label={t.label} months={months} items={items.filter((i) => i.track === t.id)} status={status} toggle={toggle} />
          ))}
        </div>
      </section>

      {/* Мобильный: список по месяцам */}
      <section className="space-y-4 md:hidden">
        {months.map((m) => (
          <div key={m} className="card p-5">
            <h2 className="text-base font-extrabold capitalize">{monthLabel(m)}</h2>
            <div className="mt-3 space-y-2.5">
              {items.filter((i) => i.due === m).map((i) => (
                <StepCard key={i.id} i={i} st={status(i)} toggle={toggle} showTrack />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="m-0 text-xl font-extrabold">Добавить свой шаг</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]">
          <label className="sr-only" htmlFor="st-title">Название шага</label>
          <input id="st-title" className="input" placeholder="Например: подготовить проект к конкурсу" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="sr-only" htmlFor="st-track">Дорожка</label>
          <select id="st-track" className="input" value={track} onChange={(e) => setTrack(e.target.value as Track)}>
            {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="st-month">Месяц</label>
          <input id="st-month" className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="btn-primary" onClick={addStep} disabled={!title.trim() || !month}>Добавить</button>
        </div>
        <p className="mt-3 text-xs text-muted">Напоминания о просроченных шагах и шагах на ближайшие 7 дней будут приходить в Telegram, когда подключим бота.</p>
      </section>
    </div>
  );
}

function Lane(props: { label: string; months: string[]; items: RoadmapItem[]; status: (i: RoadmapItem) => StepStatus; toggle: (i: RoadmapItem) => void }) {
  return (
    <>
      <div className="sticky left-0 z-10 border-b border-r border-line bg-surface px-4 py-4 text-sm font-extrabold text-ink-2">{props.label}</div>
      {props.months.map((m) => (
        <div key={m} className="flex flex-col gap-2 border-b border-line-3 p-2.5">
          {props.items.filter((i) => i.due === m).map((i) => (
            <StepCard key={i.id} i={i} st={props.status(i)} toggle={props.toggle} />
          ))}
        </div>
      ))}
    </>
  );
}

function StepCard({ i, st, toggle, showTrack }: { i: RoadmapItem; st: StepStatus; toggle: (i: RoadmapItem) => void; showTrack?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${st === "done" ? "border-line bg-bg" : st === "overdue" ? "border-orange/40 bg-surface" : "border-line bg-surface"}`}>
      <p className={`text-sm font-bold leading-snug ${st === "done" ? "text-muted line-through" : ""}`}>{i.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button onClick={() => toggle(i)} className={`pill ${STATUS[st].cls}`} aria-label={`Статус: ${STATUS[st].label}. Нажмите, чтобы изменить`}>
          {STATUS[st].label}
        </button>
        {i.estimated && <span className="pill bg-bg text-muted">ориентировочно</span>}
        {i.source === "manual" && <span className="pill bg-bg text-muted">мой шаг</span>}
        {showTrack && <span className="pill bg-bg text-muted">{TRACKS.find((t) => t.id === i.track)?.label}</span>}
      </div>
      {i.link && (
        <Link href={i.link} className="mt-2 inline-block text-xs font-extrabold text-primary">Перейти →</Link>
      )}
    </div>
  );
}
