// Списки для анкеты и фильтров — отдельно от схем zod, чтобы страницы со списками не тянули валидатор.
export const MAJORS = ["cs", "engineering", "business", "economics", "medicine", "ir", "design", "natural_sciences"] as const;
export const COUNTRIES = ["US", "AE", "HU", "TR", "KR", "DE", "IT", "JP", "UZ"] as const;
