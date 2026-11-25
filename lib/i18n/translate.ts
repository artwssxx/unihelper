// Перевод интерфейса по словарям «русский текст → перевод». Чистые функции, без DOM.
// Ключ — русская строка с нормализованными пробелами; числа в ключе заменены на «#»,
// поэтому «Шаг 3 из 9» и «Шаг 4 из 9» находят одну запись «Шаг # из #».

export type Lang = "ru" | "uz" | "en";
export type Dict = Record<string, string>;
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "ru", label: "RU", name: "Русский" },
  { id: "uz", label: "UZ", name: "O‘zbekcha" },
  { id: "en", label: "EN", name: "English" },
];
export const isLang = (v: unknown): v is Lang => v === "ru" || v === "uz" || v === "en";

const CYR = /[А-Яа-яЁё]/;
// 12 000 · 6.5 · 1,5 · 2026 — число целиком, с разделителями разрядов и дробной частью.
const NUM = /\d+(?:[  .,]\d+)*/g;

export const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
export const hasCyrillic = (s: string) => CYR.test(s);

/** Ключ словаря и числа из строки по порядку. */
export function keyOf(text: string): { key: string; nums: string[] } {
  const t = normalize(text);
  const nums = t.match(NUM) ?? [];
  return { key: t.replace(NUM, "#"), nums };
}

function lookup(dict: Dict, t: string): string | null {
  if (!t) return null;
  const exact = dict[t];
  if (exact != null) return exact;
  const { key, nums } = keyOf(t);
  const tpl = nums.length ? dict[key] : undefined;
  if (tpl == null) return null;
  let i = 0;
  return tpl.replace(/#/g, () => nums[i++] ?? "#");
}

/** Поиск с обёрткой: «Текст». / (текст) — снимаем кавычки, скобки и знаки по краям и возвращаем их на место. */
function lookupWrapped(dict: Dict, t: string): string | null {
  const direct = lookup(dict, t);
  if (direct != null) return direct;
  const m = t.match(/^([«"“(]*)(.*?)([»"”).,!?:;…]*)$/);
  if (!m || (!m[1] && !m[3]) || !m[2]) return null;
  const inner = lookup(dict, m[2]);
  return inner == null ? null : m[1] + inner + m[3];
}

// Составные строки («Подать заявку: вузы США (Regular Decision)», «Writing: 5.5 — тянет Overall вниз»):
// если целиком в словаре нет — делим сначала по «: — · ;», затем части по «, » и «(», переводим найденное.
const LEVELS = [/(: | — | · |; )/, /(, | (?=\())/];

function pieces(dict: Dict, t: string, level: number): string | null {
  const direct = lookupWrapped(dict, t);
  if (direct != null) return direct;
  if (level >= LEVELS.length) return null;
  const parts = t.split(LEVELS[level]);
  if (parts.length < 3) return pieces(dict, t, level + 1);
  let changed = false;
  const out = parts.map((p, i) => {
    if (i % 2 === 1 || !hasCyrillic(p)) return p; // нечётные — разделители
    const tr = pieces(dict, p, level + 1);
    if (tr == null) return p;
    changed = true;
    return tr;
  });
  return changed ? out.join("") : null;
}

/** Перевод строки или null, если в словаре нет. Пробелы по краям сохраняются (важно для соседних узлов). */
export function translateText(dict: Dict, text: string): string | null {
  if (!hasCyrillic(text)) return null;
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  const tr = pieces(dict, normalize(text), 0);
  return tr == null ? null : lead + tr + trail;
}
