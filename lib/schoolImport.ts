// Сохранение результата входа через eMaktab/EMIS: оценки — в профиль (GPA и подбор пересчитаются),
// дневник — в хранилище ученика. Отметки «спецпредмет», поставленные вручную, сохраняем.
import { update } from "./clientStore";
import type { Diary } from "./diary";
import type { GradeItem, Grades, GradeScale, GradeSource } from "./grades";

export type SchoolImport = { items: GradeItem[]; scale: GradeScale; source: GradeSource; period?: string; grade?: number | null; diary?: Diary };

export function gradesFrom(r: SchoolImport, prev?: Grades): Grades {
  const was = new Map((prev?.items ?? []).map((i) => [i.subject.toLowerCase(), i.special]));
  return {
    items: r.items.map((i) => ({ ...i, ...(i.special || was.get(i.subject.toLowerCase()) ? { special: true } : {}) })),
    scale: r.scale,
    source: r.source,
    updatedAt: new Date().toISOString(),
    ...(r.period ? { period: r.period } : {}),
    useForGpa: prev?.useForGpa ?? true,
  };
}

/** Записать оценки в профиль (если анкета уже есть) и дневник. updateGrade — обновить класс/курс из системы. */
export function applySchoolImport(r: SchoolImport, opts: { updateGrade?: boolean } = {}) {
  update((s) => ({
    ...(r.diary ? { diary: r.diary } : {}),
    ...(s.profile && r.items.length
      ? { profile: { ...s.profile, grades: gradesFrom(r, s.profile.grades), ...(opts.updateGrade && r.grade ? { grade: r.grade } : {}) } }
      : {}),
  }));
}
