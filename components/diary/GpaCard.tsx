"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import SchoolConnect from "@/components/diary/SchoolConnect";
import { dayLessons, gpaLabel, SOURCE_NAME, todayIso, upcomingHomework } from "@/lib/diary";
import { gradesSummary } from "@/lib/grades";
import { applySchoolImport } from "@/lib/schoolImport";
import { profileGpa100 } from "@/lib/scoring/strength";
import { useProfile } from "@/lib/useProfile";
import { useDiaryAutoRefresh } from "@/lib/useDiaryAutoRefresh";

/** Главная: GPA с оценкой и переход в «Дневник»; без подключённого дневника — кнопки входа eMaktab / EMIS. */
export default function GpaCard({ className = "" }: { className?: string }) {
  const { profile, store } = useProfile();
  const router = useRouter();
  useDiaryAutoRefresh(); // главная тоже обновляет дневник в фоне, если он устарел
  if (!profile) return null;
  const diary = store?.diary;
  if (!diary) {
    return (
      <div className={`card space-y-3 p-4 ${className}`}>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-muted">GPA и дневник</div>
          <p className="mt-1 text-sm text-body">Подключи eMaktab или EMIS — покажем GPA, оценки, расписание и домашку, и как это влияет на поступление.</p>
        </div>
        <SchoolConnect compact onDone={(r) => { applySchoolImport({ ...r, diary: r.diary ? { ...r.diary, auto: Boolean(r.remembered) } : undefined }); router.push("/diary"); }} />
      </div>
    );
  }
  const s = gradesSummary(profile.grades, []);
  const g100 = profileGpa100(profile);
  const lab = g100 != null ? gpaLabel(g100) : null;
  const today = todayIso();
  const lessons = dayLessons(diary, today).lessons.length;
  const hw = upcomingHomework(diary, today).filter((h) => h.date >= today).length;
  return (
    <Link href="/diary" className={`card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 ${className}`} aria-label="Открыть дневник">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-muted">GPA · {SOURCE_NAME[diary.source]}</div>
        <div className="mt-0.5 text-[32px] font-extrabold leading-none">{s?.average ?? "—"}<span className="text-base text-muted"> из {s?.scale ?? 5}</span></div>
      </div>
      <div className="min-w-0 flex-1">
        {lab && <span className={`gpa-${lab.tone} inline-block rounded-full px-3 py-1 text-sm font-extrabold`}>{lab.label}</span>}
        <p className="mt-1 text-xs text-muted"><span>{lessons ? `Сегодня уроков: ${lessons}` : "Сегодня уроков нет"}</span>{hw ? <span>{` · домашка: ${hw}`}</span> : null}</p>
      </div>
      <span className="flex-none text-sm font-bold text-primary">Дневник →</span>
    </Link>
  );
}
