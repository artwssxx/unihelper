"use client";

import Link from "next/link";
import { dayLessons, shiftIso, todayIso } from "@/lib/diary";
import { useProfile } from "@/lib/useProfile";

/** Главная, внизу: уроки на сегодня (или следующий учебный день) с отметками за урок и текущей оценкой по предмету. */
export default function TodayLessons() {
  const { store } = useProfile();
  const diary = store?.diary;
  if (!diary) return null;
  const today = todayIso();
  // Сегодня уроков нет (выходной или вечер воскресенья) — показываем ближайший учебный день.
  let date = today;
  let { lessons, projected } = dayLessons(diary, date);
  for (let i = 1; !lessons.length && i <= 7; i++) {
    date = shiftIso(today, i);
    ({ lessons, projected } = dayLessons(diary, date));
  }
  if (!lessons.length) return null;
  const grade = (subject: string) => diary.subjects.find((s) => s.subject.toLowerCase() === subject.toLowerCase())?.grade ?? null;
  const [y, m, d] = date.split("-").map(Number);
  const label = date === today ? "Уроки на сегодня" : date === shiftIso(today, 1) ? "Уроки на завтра" : `Уроки: ${new Date(y, m - 1, d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}`;
  return (
    <section className="card mt-5" aria-labelledby="todayT">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="todayT" className="m-0 text-xl font-extrabold">{label}</h2>
        <Link href="/diary" className="text-sm font-bold text-primary">Весь дневник →</Link>
      </div>
      {projected && <p className="mt-1 text-xs text-muted">По обычному расписанию — обнови дневник, чтобы увидеть темы и домашку.</p>}
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {lessons.map((l, i) => {
          const g = grade(l.subject);
          return (
            <li key={i} className={`flex items-center gap-3 rounded-2xl border border-line p-3 ${l.absent ? "bg-red-soft" : ""}`}>
              <div className="w-[48px] flex-none text-center">
                <div className="text-sm font-extrabold">{l.start ?? l.n ?? "—"}</div>
                {l.end && <div className="text-[11px] text-muted">{l.end}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[15px]" translate="no">{l.subject}</b>
                <span className="block truncate text-xs text-muted">
                  {l.room ? `каб. ${l.room}` : ""}{l.room && (l.homework || l.homeworkUrl) ? " · " : ""}{l.homework || l.homeworkUrl ? "есть д/з" : ""}{l.absent ? " · пропуск" : ""}
                </span>
              </div>
              <div className="flex flex-none items-center gap-1">
                {l.marks.map((v, j) => <span key={j} className="rounded-lg bg-primary px-2 py-0.5 text-sm font-extrabold text-white" title="Отметка за урок">{v}</span>)}
                {g != null && <span className="rounded-lg bg-line-3 px-2 py-0.5 text-sm font-bold text-ink-2" title="Текущая оценка по предмету">{g}</span>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted">Синим — отметки за урок, серым — текущая средняя по предмету.</p>
    </section>
  );
}
