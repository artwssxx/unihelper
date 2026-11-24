import { t } from "./i18n/ru";

// Название страны по коду ISO2: сначала наш словарь, иначе — встроенный в браузер/Node.
let dn: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  const own = (t.countries as Record<string, string>)[code];
  if (own) return own;
  try {
    dn ??= new Intl.DisplayNames(["ru"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}
