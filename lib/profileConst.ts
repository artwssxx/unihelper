// Списки для анкеты и фильтров — отдельно от схем zod, чтобы страницы со списками не тянули валидатор.
export const MAJORS = ["cs", "engineering", "business", "economics", "medicine", "ir", "design", "natural_sciences"] as const;
/** Сколько направлений можно выбрать в анкете. */
export const MAX_MAJORS = 4;
export const COUNTRIES = ["US", "AE", "HU", "TR", "KR", "DE", "IT", "JP", "UZ"] as const;

type WithMajors = { major: (typeof MAJORS)[number]; majors?: (typeof MAJORS)[number][] };
/** Все направления ученика: основное первым, без повторов. */
export function profileMajors(p: WithMajors): (typeof MAJORS)[number][] {
  return [...new Set([p.major, ...(p.majors ?? [])])];
}
