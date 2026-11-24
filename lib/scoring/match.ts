import type { FitResult, Profile, Program } from "../types";
import { evaluateProgram } from "./fit";

export interface MatchItem {
  program: Program;
  fit: FitResult;
}

const ORDER = { high: 0, realistic: 1, ambitious: 2, not_eligible: 3 } as const;
const FUNDING_ORDER = { self_funded: 0, high: 1, medium: 2, low: 3, none: 4 } as const;

/** Шаг 1: фильтр без ИИ — страна и специальность. Партнёрство на порядок НЕ влияет. */
export function filterPrograms(profile: Profile, programs: Program[]): Program[] {
  return programs.filter((p) => {
    // Узбекские вузы показываем всегда: в каждом списке нужен запасной вариант.
    const countryOk =
      p.isLocal || profile.targetCountries.length === 0 || profile.targetCountries.includes(p.country);
    const majorOk = p.majors === "any" || p.majors.includes(profile.major);
    return countryOk && majorOk;
  });
}

export function matchPrograms(profile: Profile, programs: Program[]) {
  const items: MatchItem[] = filterPrograms(profile, programs).map((program) => ({
    program,
    fit: evaluateProgram(profile, program),
  }));
  items.sort(
    (a, b) =>
      ORDER[a.fit.admission.label] - ORDER[b.fit.admission.label] ||
      FUNDING_ORDER[a.fit.funding.label] - FUNDING_ORDER[b.fit.funding.label] ||
      a.program.university.localeCompare(b.program.university),
  );
  const abroad = items.filter((i) => !i.program.isLocal);
  const local = items.filter((i) => i.program.isLocal);
  const hasBackup = items.some((i) => i.fit.isBackup);
  return { abroad, local, hasBackup };
}
