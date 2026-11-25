"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import SchoolConnect from "@/components/diary/SchoolConnect";
import type { ImportResult } from "@/components/grades/GradesImport";
import NeedProfile from "@/components/NeedProfile";
import { Calendar, Chart, Check, Pen, Target, Warn } from "@/components/icons";
import { update } from "@/lib/clientStore";
import { dayLessons, diaryInsights, gpaLabel, shiftIso, SOURCE_NAME, todayIso, upcomingHomework, type Diary, type DiarySubject } from "@/lib/diary";
import { gradesSummary, to100 } from "@/lib/grades";
import { profileMajors } from "@/lib/profileConst";
import { applySchoolImport } from "@/lib/schoolImport";
import { profileGpa100 } from "@/lib/scoring/strength";
import { useContent } from "@/lib/useContent";
import { useProfile } from "@/lib/useProfile";

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("ru-RU", opts); };

export default function DiaryPage() {
  const { profile, store } = useProfile();
  const { programs } = useContent();
  const [note, setNote] = useState<string | null>(null);
  const diary = store?.diary;
  const done = (r: ImportResult) => {
    applySchoolImport({ ...r }, { updateGrade: false });
    setNote(`Дневник обновлён: ${r.items.length} предметов с оценками${r.diary ? `, расписание на ${r.diary.days.length} дней` : ""}.`);
  };
  if (profile === undefined) return null;
  if (profile === null) return <NeedProfile text="Дневник показывает оценки и их влияние на поступление по твоему профилю." />;

  return (
    <div className="space-y-6">
      <section>
        <div className="eyebrow">ДНЕВНИК</div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[42px]">Оценки, расписание и <span className="serif-accent text-primary">домашка</span></h1>
        <p className="mt-2 max-w-[680px] text-body">Всё из eMaktab или EMIS в одном месте — и сразу видно, как оценки влияют на поступление и что подтянуть.</p>
      </section>
      {note && <p className="rounded-2xl bg-green-soft px-5 py-3 text-sm font-semibold text-green" role="status">{note}</p>}
      {!diary ? <Connect onDone={done} /> : <DiaryView diary={diary} onDone={done} programs={[...programs, ...(store?.customUnis ?? [])]} />}
    </div>
  );
}

function Connect({ onDone }: { onDone: (r: ImportResult) => void }) {
  const items = [
    { Icon: Chart, t: "GPA и его оценка", d: "средний балл и что он значит для твоих вузов" },
    { Icon: Target, t: "Оценки с разбивкой", d: "текущие, контрольные и итоговые по каждому предмету" },
    { Icon: Calendar, t: "Расписание", d: "на сегодня и на любой день — листай" },
    { Icon: Pen, t: "Домашние задания", d: "что задали и к какому дню" },
    { Icon: Warn, t: "Пропуски", d: "сколько и по каким предметам" },
  ];
  return (
    <section className="card space-y-5">
      <div>
        <h2 className="m-0 text-xl font-extrabold">Подключи электронный дневник</h2>
        <p className="mt-1 text-sm text-body">Дневник работает через eMaktab (школы) или EMIS (лицеи). Войди своим логином ученика — пароль используется один раз и не сохраняется.</p>
      </div>
      <SchoolConnect onDone={onDone} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map(({ Icon, t, d }) => (
          <li key={t} className="flex items-start gap-3 rounded-2xl bg-line-3 p-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary-soft text-primary-ink"><Icon size={18} /></span>
            <span><b className="block text-sm">{t}</b><span className="text-sm text-muted">{d}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DiaryView({ diary, onDone, programs }: { diary: Diary; onDone: (r: ImportResult) => void; programs: Parameters<typeof diaryInsights>[1] }) {
  const { profile } = useProfile();
  const s = profile ? gradesSummary(profile.grades, profileMajors(profile)) : null;
  const g100 = profile ? profileGpa100(profile) : null;
  const lab = g100 != null ? gpaLabel(g100) : null;
  const insights = useMemo(() => (profile ? diaryInsights(profile, programs, diary) : []), [profile, programs, diary]);
  const [refresh, setRefresh] = useState(false);
  const disconnect = () => {
    if (confirm("Отключить дневник? Расписание и домашка исчезнут, оценки в профиле останутся.")) update(() => ({ diary: undefined }));
  };
  return (
    <>
      <section className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="card flex flex-wrap items-center gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted">GPA</div>
            <div className="mt-1 text-[44px] font-extrabold leading-none">{s ? s.average : "—"}<span className="text-lg text-muted"> из {s?.scale ?? 5}</span></div>
            {lab && g100 != null && <div className={`gpa-${lab.tone} mt-2 inline-block rounded-full px-3 py-1 text-sm font-extrabold`}>{lab.label} · ≈ {Math.round(g100)} из 100</div>}
          </div>
          <div className="min-w-[200px] flex-1 text-sm text-body">
            {lab && <p>{lab.hint[0].toUpperCase() + lab.hint.slice(1)}.</p>}
            <p className="mt-2 text-xs text-muted"><span>{`Из ${SOURCE_NAME[diary.source]}`}</span>{diary.period && <span>{` · ${diary.period}`}</span>} · <span>обновлено</span> <span>{new Date(diary.fetchedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary py-2 text-sm" onClick={() => setRefresh(!refresh)}>Обновить</button>
              <button className="py-2 text-sm font-semibold text-muted underline" onClick={disconnect}>Отключить</button>
            </div>
          </div>
          {refresh && <div className="w-full"><SchoolConnect only={diary.source} onDone={(r) => { setRefresh(false); onDone(r); }} /></div>}
        </div>
        <Insights items={insights} />
      </section>

      <DaySchedule diary={diary} />
      <Homework diary={diary} />
      <Subjects subjects={diary.subjects} scale={s?.scale ?? 5} source={diary.source} />
      {diary.absences && <Absences absences={diary.absences} />}
    </>
  );
}

function Insights({ items }: { items: ReturnType<typeof diaryInsights> }) {
  if (!items.length) return null;
  const tone = { good: "border-l-green", warn: "border-l-orange", bad: "border-l-red", info: "border-l-primary" } as const;
  return (
    <section className="card space-y-3" aria-labelledby="insT">
      <h2 id="insT" className="m-0 text-lg font-extrabold">Как это влияет на поступление</h2>
      {items.map((i) => (
        <div key={i.title} className={`rounded-xl border-l-4 bg-line-3 px-4 py-3 ${tone[i.tone]}`}>
          <b className="block text-[15px]">{i.title}</b>
          <p className="mt-0.5 text-sm text-body">{i.text.map((t, k) => <span key={k}>{k ? " " : ""}{t}</span>)}</p>
        </div>
      ))}
      <p className="text-xs text-muted">Считает код по твоему профилю и подбору: сила профиля из 100 и метки вузов. Это не шанс поступления.</p>
    </section>
  );
}

function DaySchedule({ diary }: { diary: Diary }) {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const touch = useRef<number | null>(null);
  const { lessons, projected } = dayLessons(diary, date);
  const go = (n: number) => setDate((d) => shiftIso(d, n));
  return (
    <section className="card space-y-4" aria-labelledby="schT2"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="schT2" className="m-0 text-lg font-extrabold">Расписание</h2>
        <div className="flex items-center gap-1.5">
          <button className="btn-secondary h-10 w-10 p-0" aria-label="Предыдущий день" onClick={() => go(-1)}>‹</button>
          <button className="btn-secondary h-10 px-3 text-sm" disabled={date === today} onClick={() => setDate(today)}>Сегодня</button>
          <button className="btn-secondary h-10 w-10 p-0" aria-label="Следующий день" onClick={() => go(1)}>›</button>
        </div>
      </div>
      <p className="text-sm font-semibold text-ink-2">{date === today ? "Сегодня, " : date === shiftIso(today, 1) ? "Завтра, " : ""}{fmtDay(date, { weekday: "long", day: "numeric", month: "long" })}</p>
      {projected && <p className="rounded-xl bg-line-3 px-3 py-2 text-xs text-muted">Обычное расписание этого дня недели. Темы и домашка появятся, когда обновишь дневник ближе к дате.</p>}
      {!lessons.length ? (
        <p className="text-sm text-muted">Уроков нет.</p>
      ) : (
        <ol className="space-y-2">
          {lessons.map((l, i) => (
            <li key={i} className={`flex gap-3 rounded-2xl border border-line p-3 ${l.absent ? "bg-red-soft" : ""}`}>
              <div className="w-[52px] flex-none text-center">
                <div className="text-sm font-extrabold">{l.start ?? (l.n ? `${l.n}` : "—")}</div>
                {l.end && <div className="text-xs text-muted">{l.end}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b className="text-[15px]" translate="no">{l.subject}</b>
                  {l.kind && <span className="pill bg-bg text-muted" translate="no">{l.kind}</span>}
                  {l.absent && <span className="pill bg-red-soft text-red">пропуск</span>}
                  {l.marks.map((m, j) => <span key={j} className="rounded-lg bg-primary-soft px-2 py-0.5 text-sm font-extrabold text-primary-ink">{m}</span>)}
                </div>
                <p className="text-xs text-muted">{l.room ? `каб. ${l.room}` : ""}{l.room && l.topic ? " · " : ""}<span translate="no">{l.topic ?? ""}</span></p>
                {(l.homework || l.homeworkUrl) && (
                  <p className="mt-1 text-sm"><b>Д/з:</b> <span translate="no">{l.homework ?? ""}</span>{l.homeworkUrl && <> <a className="font-semibold text-primary underline" href={l.homeworkUrl} target="_blank" rel="noopener noreferrer">файл задания</a></>}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-muted sm:hidden">Листай влево и вправо, чтобы сменить день.</p>
    </section>
  );
}

function Homework({ diary }: { diary: Diary }) {
  const list = upcomingHomework(diary, todayIso());
  return (
    <section className="card space-y-3" aria-labelledby="hwT">
      <h2 id="hwT" className="m-0 text-lg font-extrabold">Домашние задания</h2>
      {!list.length ? (
        <p className="text-sm text-muted">{diary.source === "emis" ? "Пока ничего не задано (в EMIS домашка приходит файлом к теме урока)." : "Пока ничего не задано."}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((h, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-line-3 p-3">
              <span className="w-[86px] flex-none text-xs font-bold uppercase text-muted">{fmtDay(h.date, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="min-w-0 text-sm"><b translate="no">{h.subject}</b>{h.text && <> — <span translate="no">{h.text}</span></>}{h.url && <> <a className="font-semibold text-primary underline" href={h.url} target="_blank" rel="noopener noreferrer">файл задания</a></>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Subjects({ subjects, scale, source }: { subjects: DiarySubject[]; scale: number; source: Diary["source"] }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...subjects].sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));
  const color = (g: number | null) => (g == null ? "text-muted" : to100(g, scale as 5) >= 90 ? "text-green" : to100(g, scale as 5) >= 70 ? "text-ink" : "text-red");
  return (
    <section className="card space-y-3" aria-labelledby="subT">
      <h2 id="subT" className="m-0 text-lg font-extrabold">Оценки по предметам</h2>
      <ul className="divide-y divide-line">
        {sorted.map((x) => (
          <li key={x.subject}>
            <button className="flex w-full items-center justify-between gap-3 py-3 text-left" aria-expanded={open === x.subject} onClick={() => setOpen(open === x.subject ? null : x.subject)}>
              <span className="min-w-0">
                <b className="text-[15px]" translate="no">{x.subject}</b>
                {x.special && <span className="pill ml-2 bg-primary-soft text-primary-ink">спецпредмет</span>}
                {x.parts.length > 0 && <span className="block text-xs text-muted" translate="no">{x.parts.map((p) => `${p.name}: ${p.avg ?? "—"}`).join(" · ")}</span>}
              </span>
              <span className={`flex-none text-xl font-extrabold ${color(x.grade)}`}>{x.grade ?? "—"}</span>
            </button>
            {open === x.subject && (
              <div className="space-y-2 pb-3">
                {x.parts.map((p) => (
                  <div key={p.name}>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted" translate="no">{p.name} · среднее {p.avg ?? "—"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.marks.map((m, i) => (
                        <span key={i} title={fmtDay(m.date, { day: "numeric", month: "long" })} className="rounded-lg border border-line px-2 py-1 text-center text-sm font-bold">
                          {m.value}<span className="block text-[10px] font-normal text-muted">{fmtDay(m.date, { day: "numeric", month: "short" })}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {source === "emis" && x.semesterRating != null && <p className="text-xs text-muted">Рейтинг семестра в EMIS: {x.semesterRating}. Пока нет итогового контроля, он неполный — оценка выше считается по текущему и промежуточному контролю.</p>}
                {!x.parts.length && <p className="text-xs text-muted">Подробных отметок нет — только итог за период.</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Оценки сохранены и в профиле: от них считаются GPA, сила профиля и подбор. Изменить вручную — в <Link href="/profile" className="font-semibold underline">профиле</Link>.</p>
    </section>
  );
}

function Absences({ absences }: { absences: NonNullable<Diary["absences"]> }) {
  const by = new Map<string, number>();
  for (const a of absences.items) by.set(a.subject, (by.get(a.subject) ?? 0) + 1);
  return (
    <section className="card space-y-3" aria-labelledby="absT">
      <div className="flex items-center justify-between gap-3">
        <h2 id="absT" className="m-0 text-lg font-extrabold">Пропуски</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${absences.total >= 10 ? "bg-red-soft text-red" : absences.total ? "bg-orange-soft text-orange-ink-2" : "bg-green-soft text-green"}`}>
          {absences.total ? `${absences.total} за семестр` : <><Check size={14} className="inline" /> без пропусков</>}
        </span>
      </div>
      {absences.total > 0 && (
        <>
          <div className="flex flex-wrap gap-2" translate="no">
            {[...by].sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k} className="rounded-full bg-line-3 px-3 py-1 text-sm">{k}: <b>{v}</b></span>)}
          </div>
          <p className="text-xs text-muted">Последние: {absences.items.slice(0, 6).map((a) => `${fmtDay(a.date, { day: "numeric", month: "short" })} — ${a.subject}`).join("; ")}</p>
        </>
      )}
    </section>
  );
}
