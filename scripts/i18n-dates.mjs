// Словарные записи для дат: те же форматы, что в коде (toLocaleDateString("ru-RU", …)), во всех
// месяцах и днях недели. Ключ — русская строка, перевод — та же дата в uz/en; числа → «#».
// Вызывается из i18n-translate.mjs; Intl в Node знает узбекский и английский.

const NUM = /\d+(?:[  .,]\d+)*/g;
const FORMATS = [
  { month: "short" },
  { month: "long" },
  { month: "long", year: "numeric" },
  { day: "numeric", month: "short" },
  { day: "numeric", month: "long" },
  { day: "numeric", month: "long", year: "numeric" },
  { weekday: "long", day: "numeric", month: "long" },
  { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
];
const LOC = { ru: "ru-RU", uz: "uz-Latn-UZ", en: "en-US" };
const key = (s) => s.replace(/\s+/g, " ").trim().replace(NUM, "#");

export function dateEntries() {
  const out = new Map(); // ключ → { uz, en }
  for (const opts of FORMATS) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= (opts.weekday ? 7 : 1); d++) {
        const date = new Date(Date.UTC(2026, m, d + 2, 9, 30));
        const f = (l) => date.toLocaleString(LOC[l], { ...opts, timeZone: "UTC", hourCycle: "h23" });
        const ru = f("ru");
        // как есть, капсом (дата на главной) и без точки сокращения (подписи графиков: «нояб»)
        const forms = [(s) => s, (s) => s.toUpperCase(), (s) => s.replace(/\.$/, "")];
        for (const form of forms) {
          const k = key(form(ru));
          if (!/[А-Яа-яЁё]/.test(k) || out.has(k)) continue;
          const uz = key(form(f("uz"))), en = key(form(f("en")));
          const n = (x) => x.split("#").length;
          if (n(uz) === n(k) && n(en) === n(k)) out.set(k, { uz, en });
        }
      }
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const e = dateEntries();
  console.log(e.size);
  console.log([...e].slice(0, 8).map(([k, v]) => `${k} → ${v.uz} | ${v.en}`).join("\n"));
}

// Названия стран (выбор из всех стран мира): русское название → uz/en через Intl. Короткие названия из lib/i18n/ru.ts — вручную.
const COUNTRY_OWN = {
  US: ["США", "AQSh", "USA"], KR: ["Корея", "Koreya", "Korea"], AE: ["ОАЭ", "BAA", "UAE"], HU: ["Венгрия", "Vengriya", "Hungary"],
  TR: ["Турция", "Turkiya", "Türkiye"], DE: ["Германия", "Germaniya", "Germany"], IT: ["Италия", "Italiya", "Italy"], JP: ["Япония", "Yaponiya", "Japan"],
  UZ: ["Узбекистан", "O‘zbekiston", "Uzbekistan"], HK: ["Гонконг", "Gonkong", "Hong Kong"], MO: ["Макао", "Makao", "Macau"],
  PS: ["Палестина", "Falastin", "Palestine"], KP: ["КНДР", "Shimoliy Koreya", "North Korea"], CD: ["ДР Конго", "Kongo DR", "DR Congo"], CG: ["Конго", "Kongo", "Congo"],
};
export function countryEntries(codes) {
  const dn = (l) => new Intl.DisplayNames([l], { type: "region" });
  const ru = dn("ru"), uz = dn("uz"), en = dn("en");
  const out = new Map();
  for (const c of codes) {
    const own = COUNTRY_OWN[c];
    if (own) out.set(key(own[0]), { uz: own[1], en: own[2] });
    else out.set(key(ru.of(c)), { uz: key(uz.of(c)), en: key(en.of(c)) });
  }
  return out;
}
