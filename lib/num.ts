// Ввод чисел с телефона: iOS/Android с русской или узбекской раскладкой дают десятичную запятую («4,2»),
// а <input type="number"> такое значение отбрасывает. Поэтому поля — текстовые с inputMode, разбор — здесь.

/** «4,2» / «4.2» / « 7 » → число; пустое или не число → null. */
export function parseDecimal(raw: string): number | null {
  const s = raw.replace(/\s+/g, "").replace(",", ".");
  if (!s || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return null;
  const n = Number(s.endsWith(".") ? s.slice(0, -1) : s);
  return Number.isFinite(n) ? n : null;
}

/** Можно ли продолжать набирать это значение (промежуточные «4,» и «» — да). */
export const typingDecimal = (raw: string) => /^\s*\d*([.,]\d*)?\s*$/.test(raw);
