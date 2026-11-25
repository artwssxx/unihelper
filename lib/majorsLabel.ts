import { t } from "./i18n/ru";
import { profileMajors } from "./profileConst";
import type { Profile } from "./types";

/** Подпись направлений: «IT и Computer Science, Бизнес · минор: экономика». */
export function majorsLabel(p: Pick<Profile, "major" | "majors" | "majorOther" | "minor">): string {
  const list = [...profileMajors(p).map((m) => t.majors[m]), p.majorOther].filter(Boolean).join(", ");
  return p.minor ? `${list} · минор: ${p.minor}` : list;
}
