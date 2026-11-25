// Дневник ученика из eMaktab (школы) или EMIS (лицеи): оценки с разбивкой по видам контроля, расписание,
// домашние задания, пропуски — и разбор, как это влияет на поступление. Только чистые функции (с тестами).
// Данные приходят снимком при входе ученика (пароль не хранится); обновить — войти ещё раз.

import type { GradeItem, Grades, SubjectKey } from "./grades";
import { gradesSummary, to100 } from "./grades";
import { profileMajors } from "./profileConst";
import { FIT_RULES } from "./scoring/config";
import { matchPrograms } from "./scoring/match";
import { profileGpa100, scoreProfile } from "./scoring/strength";
import type { FitLabel, Profile, Program } from "./types";

export type DiarySource = "emis" | "emaktab";

export interface DiaryMark { date: string; value: number }
export interface DiarySubject {
  subject: string;
  key: SubjectKey;
  special?: boolean;
  /** Оценка за период — как в оценках профиля. */
  grade: number | null;
  /** Разбивка: текущий / промежуточный / итоговый контроль (EMIS) или отметки по датам (eMaktab). */
  parts: { name: string; avg: number | null; marks: DiaryMark[] }[];
  /** Рейтинг семестра из системы (пока нет итогового контроля — неполный). */
  semesterRating?: number | null;
}
export interface DiaryLesson {
  n: number | null;
  start: string | null;
  end: string | null;
  subject: string;
  room: string | null;
  /** Вид занятия: «Oraliq nazorat», «Контрольная» и т. п. */
  kind: string | null;
  topic: string | null;
  homework: string | null;
  homeworkUrl: string | null;
  marks: number[];
  absent: boolean;
}
export interface DiaryDay { date: string; lessons: DiaryLesson[] }
export interface Diary {
  source: DiarySource;
  fetchedAt: string;
  period: string | null;
  school: string | null;
  className: string | null;
  subjects: DiarySubject[];
  days: DiaryDay[];
  absences: { total: number; items: { date: string; subject: string }[] } | null;
}
/** Данные ученика для автозаполнения анкеты (с его согласия). Без ПИНФЛ, паспорта, даты рождения и адреса. */
export interface DiaryPerson { firstName: string | null; lastName: string | null; region: string | null; school: string | null; className: string | null; grade: number | null }

export const SOURCE_NAME: Record<DiarySource, string> = { emaktab: "eMaktab", emis: "EMIS" };

// ── GPA и его оценка ──

export type GpaTone = "great" | "good" | "ok" | "weak" | "bad";
/** Пороги совпадают с осью «Учёба» силы профиля (75 / 88 / 95 из 100). */
export function gpaLabel(gpa100: number): { tone: GpaTone; label: string; hint: string } {
  if (gpa100 >= 95) return { tone: "great", label: "отлично", hint: "на уровне сильнейших поступающих" };
  if (gpa100 >= 88) return { tone: "good", label: "хорошо", hint: "проходит в большинство программ с грантами" };
  if (gpa100 >= 75) return { tone: "ok", label: "приемлемо", hint: "хватает для части программ, но для топовых грантов мало" };
  if (gpa100 >= 65) return { tone: "weak", label: "слабо", hint: "многие гранты закрыты, нужно подтянуть оценки" };
  return { tone: "bad", label: "плохо", hint: "сначала подтяни оценки, потом всё остальное" };
}

// ── Расписание ──

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = (now = new Date()) => iso(now);
export function shiftIso(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return iso(new Date(y, m - 1, d + days));
}
const weekday = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };

/**
 * Уроки на день. Если дня нет в снимке — показываем обычное расписание этого дня недели
 * (по ближайшему такому же дню из снимка), с пометкой projected: без тем, оценок и домашки.
 */
export function dayLessons(diary: Pick<Diary, "days">, date: string): { lessons: DiaryLesson[]; projected: boolean } {
  const exact = diary.days.find((d) => d.date === date);
  if (exact) return { lessons: exact.lessons, projected: false };
  const wd = weekday(date);
  if (wd === 0) return { lessons: [], projected: false };
  const same = diary.days.filter((d) => weekday(d.date) === wd && d.lessons.length).sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(date)) - Math.abs(Date.parse(b.date) - Date.parse(date)))[0];
  if (!same) return { lessons: [], projected: false };
  return { lessons: same.lessons.map((l) => ({ ...l, topic: null, homework: null, homeworkUrl: null, marks: [], absent: false, kind: null })), projected: true };
}

/** Домашние задания с сегодняшнего дня (и вчерашние — вдруг не сделал), по датам. */
export function upcomingHomework(diary: Pick<Diary, "days">, today: string, limit = 12) {
  return diary.days
    .filter((d) => d.date >= shiftIso(today, -1))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((d) => d.lessons.filter((l) => l.homework || l.homeworkUrl).map((l) => ({ date: d.date, subject: l.subject, text: l.homework, url: l.homeworkUrl })))
    .slice(0, limit);
}

// ── Как это влияет на поступление ──

/** text — отдельные предложения: каждое переводится словарём само по себе. */
export interface Insight { tone: "good" | "warn" | "bad" | "info"; title: string; text: string[] }

const RANK: Record<FitLabel, number> = { not_eligible: 0, ambitious: 1, realistic: 2, high: 3 };
const fitCount = (p: Profile, programs: Program[]) => {
  const m = matchPrograms(p, programs);
  return [...m.abroad, ...m.local];
};
const withGrades = (p: Profile, items: GradeItem[]): Profile => ({ ...p, grades: { ...(p.grades as Grades), items } });

/**
 * Разбор для вкладки «Дневник»: что значит GPA, что даст рост слабого профильного предмета и что будет при падении,
 * разрыв между текущими оценками и контрольными, пропуски. Цифры считает код (сила профиля, метки подбора).
 */
export function diaryInsights(profile: Profile, programs: Program[], diary?: Pick<Diary, "subjects" | "absences"> | null): Insight[] {
  const out: Insight[] = [];
  const g = profile.grades;
  const s = gradesSummary(g, profileMajors(profile));
  const g100 = profileGpa100(profile);
  if (!g || !s || g100 == null) return out;
  const base = scoreProfile(profile).score;
  const now = fitCount(profile, programs);

  // 1. Что значит GPA для подбора.
  const known = now.filter((i) => i.program.typical.gpa100 != null);
  const atOrAbove = known.filter((i) => g100 >= (i.program.typical.gpa100 as number) - FIT_RULES.tolerance.gpa100).length;
  const lab = gpaLabel(g100);
  out.push({
    tone: lab.tone === "great" || lab.tone === "good" ? "good" : lab.tone === "ok" ? "info" : "bad",
    title: `GPA ${s.average} из ${s.scale} — ${lab.label}`,
    text: [`${lab.hint[0].toUpperCase()}${lab.hint.slice(1)}.`, `Это ≈ ${Math.round(g100)} из 100.`, ...(known.length ? [`На уровне типичных поступивших или выше — в ${atOrAbove} из ${known.length} программ твоего подбора.`] : [])],
  });

  // 2. Что улучшит: слабейший профильный (или общий) предмет +0.5.
  const pool = (s.core.items.length ? s.core.items : g.items).filter((i) => i.grade < s.scale);
  const weakest = [...pool].sort((a, b) => a.grade - b.grade)[0];
  if (weakest) {
    const step = s.scale === 5 ? 0.5 : s.scale === 10 ? 1 : 10;
    const up = Math.min(s.scale, Math.round((weakest.grade + step) * 100) / 100);
    const better = withGrades(profile, g.items.map((i) => (i === weakest ? { ...i, grade: up } : i)));
    const delta = scoreProfile(better).score - base;
    const after = fitCount(better, programs);
    const rose = after.filter((i) => { const was = now.find((x) => x.program.id === i.program.id); return was && RANK[i.fit.admission.label] > RANK[was.fit.admission.label]; }).length;
    out.push({
      tone: "good",
      title: `Что даст рост: ${weakest.subject} ${weakest.grade} → ${up}`,
      text: [
        delta > 0 ? `Сила профиля +${delta} (с ${base} до ${base + delta} из 100).` : "Сила профиля почти не изменится.",
        ...(rose ? [`Вузов, где оценка поступления станет выше: ${rose}.`] : []),
        ...(s.core.keys.includes(weakest.key) ? ["Это профильный предмет — вузы смотрят на него в первую очередь."] : []),
      ],
    });
  }

  // 3. Что ухудшит: падение сильнейшего профильного предмета.
  const strongest = [...(s.core.items.length ? s.core.items : g.items)].sort((a, b) => b.grade - a.grade)[0];
  if (strongest && strongest !== weakest) {
    const step = s.scale === 5 ? 0.5 : s.scale === 10 ? 1 : 10;
    const down = Math.max(1, Math.round((strongest.grade - step) * 100) / 100);
    const worse = withGrades(profile, g.items.map((i) => (i === strongest ? { ...i, grade: down } : i)));
    const delta = base - scoreProfile(worse).score;
    const after = fitCount(worse, programs);
    const fell = after.filter((i) => { const was = now.find((x) => x.program.id === i.program.id); return was && RANK[i.fit.admission.label] < RANK[was.fit.admission.label]; }).length;
    if (delta > 0 || fell)
      out.push({ tone: "warn", title: `Что ухудшит: ${strongest.subject} ${strongest.grade} → ${down}`, text: [`Сила профиля −${delta}.`, ...(fell ? [`Вузов, которые опустятся по оценке поступления: ${fell}.`] : []), "Держи этот предмет на уровне."] });
  }

  // 4. Контрольные хуже текущих оценок (EMIS: текущий и промежуточный контроль).
  const gap = (diary?.subjects ?? [])
    .map((x) => ({ x, cur: x.parts.find((p) => /joriy|текущ/i.test(p.name))?.avg, mid: x.parts.find((p) => /oraliq|промежут/i.test(p.name))?.avg }))
    .filter((v) => v.cur != null && v.mid != null && (v.cur as number) - (v.mid as number) >= 1);
  if (gap.length)
    out.push({ tone: "warn", title: "Контрольные ниже текущих оценок", text: [`${gap.map((v) => `${v.x.subject}: текущие ${v.cur}, контрольная ${v.mid}`).join("; ")}.`, "Итоговый контроль весит больше — готовься к нему отдельно."] });

  // 5. Пропуски.
  const abs = diary?.absences;
  if (abs && abs.total > 0) {
    const by = new Map<string, number>();
    for (const a of abs.items) by.set(a.subject, (by.get(a.subject) ?? 0) + 1);
    const top = [...by].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
    out.push({
      tone: abs.total >= 10 ? "bad" : "info",
      title: `Пропусков: ${abs.total}`,
      text: ["Пропуски в табель для вуза не попадают, но снижают текущие оценки и то, что учителя напишут в рекомендациях.", ...(top ? [`Больше всего: ${top}.`] : [])],
    });
  }

  // 6. Спецпредметы.
  const strongSpecial = s.special.filter((i) => to100(i.grade, s.scale) >= 90);
  if (strongSpecial.length)
    out.push({ tone: "good", title: "Сильные спецпредметы", text: [`${strongSpecial.map((i) => i.subject).join(", ")} — укажи их в анкетах вузов и в эссе.`, "Углублённое изучение заметно на фоне обычной школы."] });
  return out;
}
