import "server-only";
import { isLang, type Lang } from "@/lib/i18n/translate";

// Язык ответов ИИ = язык интерфейса ученика (заголовок x-uh-lang ставит apiFetch).

export function langOf(req: Request): Lang {
  const v = req.headers.get("x-uh-lang");
  return isLang(v) ? v : "ru";
}

export const LANG_RULE: Record<Lang, string> = {
  ru: "Все тексты для ученика пиши по-русски.",
  uz: "Все тексты для ученика пиши на узбекском языке (латиница, буквы o‘ и g‘), просто и понятно.",
  en: "Write all texts for the student in simple, clear English.",
};
