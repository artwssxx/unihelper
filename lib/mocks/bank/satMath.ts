import type { Difficulty, Question } from "../types";

// Банк SAT Math: оригинальные задачи по шаблонам в стиле digital SAT.
// Числа подбираются детерминированно (seed), правильный ответ считает код,
// поэтому каждая задача проверена по построению (source = "code").

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type R = () => number;
const int = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: R, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const LETTERS = ["A", "B", "C", "D"];

/** Подписанный коэффициент: «+ 5», «− 5». */
const sg = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`);
const num = (n: number) => (n < 0 ? `−${-n}` : String(n));
/** Отрицательное число в скобках: (−3). */
const par = (n: number) => (n < 0 ? `(${num(n)})` : String(n));

interface Draft {
  domain: string;
  skill: string;
  difficulty: Difficulty;
  stem: string;
  correct: number | string;
  distractors?: (number | string)[];
  spr?: boolean;
  explanation: string;
  hint: string;
  fmt?: (v: number | string) => string;
}

type Template = { key: string; make: (r: R) => Draft | null };

const TEMPLATES: Template[] = [
  {
    key: "lin",
    make: (r) => {
      const a = int(r, 2, 7), x = int(r, 2, 9), b = int(r, 1, 15), k = int(r, 2, 4), m = int(r, 1, 9);
      const c = a * x + b;
      const ans = k * a * x - m;
      return {
        domain: "Algebra", skill: "Линейные уравнения", difficulty: 1,
        stem: `Если ${a}x ${sg(b)} = ${c}, чему равно значение выражения ${k * a}x − ${m}?`,
        correct: ans, distractors: [x, k * a * x, k * c - m],
        explanation: `${a}x = ${c - b}, значит x = ${x}. Тогда ${k * a}x = ${k * a * x}, и ${k * a * x} − ${m} = ${ans}. Быстрее: ${k * a}x = ${k}·(${a}x) = ${k}·${c - b}.`,
        hint: `Не обязательно искать x: ${k * a}x — это ${k}·(${a}x).`,
      };
    },
  },
  {
    key: "slope",
    make: (r) => {
      let m = int(r, -4, 5); if (m === 0) m = 3;
      const x1 = int(r, -5, 4), dx = int(r, 1, 5), y1 = int(r, -6, 8);
      const x2 = x1 + dx, y2 = y1 + m * dx;
      return {
        domain: "Algebra", skill: "Линейные функции", difficulty: 1,
        stem: `Прямая проходит через точки (${num(x1)}; ${num(y1)}) и (${num(x2)}; ${num(y2)}). Чему равен угловой коэффициент (slope) этой прямой?`,
        correct: m, distractors: [-m, m + 1, dx === 1 ? m * 2 : dx],
        explanation: `Slope = (y₂ − y₁) / (x₂ − x₁) = (${num(y2)} − ${par(y1)}) / (${num(x2)} − ${par(x1)}) = ${num(m * dx)} / ${dx} = ${num(m)}.`,
        hint: "Угловой коэффициент — изменение y, делённое на изменение x.",
        fmt: (v) => num(Number(v)),
      };
    },
  },
  {
    key: "median",
    make: (r) => {
      const xs = Array.from({ length: 7 }, () => int(r, 2, 40));
      const sorted = [...xs].sort((p, q) => p - q);
      const med = sorted[3];
      const unsortedMid = xs[3];
      return {
        domain: "Problem-Solving and Data Analysis", skill: "Статистика", difficulty: 1,
        stem: `Дан набор чисел: ${xs.join(", ")}. Чему равна медиана этого набора?`,
        correct: med, distractors: [unsortedMid !== med ? unsortedMid : med + 1, sorted[2] !== med ? sorted[2] : med - 1, sorted[4] !== med ? sorted[4] : med + 2],
        explanation: `Упорядочим: ${sorted.join(", ")}. Медиана — четвёртое число из семи: ${med}.`,
        hint: "Сначала упорядочите числа по возрастанию.",
      };
    },
  },
  {
    key: "scale",
    make: (r) => {
      const s = pick(r, [2, 3, 4, 5, 8, 10, 12, 15, 20, 25]), d = int(r, 3, 14);
      return {
        domain: "Problem-Solving and Data Analysis", skill: "Пропорции", difficulty: 1,
        stem: `На карте 1 см соответствует ${s} км. Расстояние между двумя городами на карте ${d} см. Каково расстояние между ними в километрах?`,
        correct: s * d, distractors: [s + d, s * (d + 1), s * d * 10],
        explanation: `${d} см × ${s} км/см = ${s * d} км.`,
        hint: "Каждый сантиметр — это одинаковое число километров.",
      };
    },
  },
  {
    key: "pyth",
    make: (r) => {
      const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10]] as const);
      const k = int(r, 1, 4);
      return {
        domain: "Geometry and Trigonometry", skill: "Прямоугольный треугольник", difficulty: 1,
        stem: `Катеты прямоугольного треугольника равны ${a * k} и ${b * k}. Чему равна гипотенуза?`,
        correct: c * k, distractors: [(a + b) * k, c * k + 1, c * k - 1],
        explanation: `По теореме Пифагора: √(${a * k}² + ${b * k}²) = √${(c * k) ** 2} = ${c * k}.`,
        hint: "c² = a² + b².",
      };
    },
  },
  {
    key: "system",
    make: (r) => {
      const x = int(r, 1, 9), y = int(r, 1, 9);
      const a1 = int(r, 1, 4), b1 = int(r, 1, 4), a2 = int(r, 1, 5), b2 = -int(r, 1, 4);
      if (a1 * b2 - a2 * b1 === 0) return null;
      const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
      const f = (a: number, b: number) => `${a === 1 ? "" : a}x ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y`;
      return {
        domain: "Algebra", skill: "Системы линейных уравнений", difficulty: 2,
        stem: `Пара (x; y) — решение системы:\n${f(a1, b1)} = ${c1}\n${f(a2, b2)} = ${num(c2)}\nЧему равно x + y?`,
        correct: x + y, distractors: [x, y, x * y === x + y ? x + y + 2 : x * y],
        explanation: `Решение системы: x = ${x}, y = ${y} (подставьте и проверьте оба уравнения). x + y = ${x + y}.`,
        hint: "Выразите одну переменную из уравнения и подставьте в другое — или сложите уравнения с подходящими множителями.",
      };
    },
  },
  {
    key: "taxi",
    make: (r) => {
      const f = pick(r, [4, 5, 6, 7, 8]), rate = pick(r, [2, 3, 4, 5]), n = int(r, 3, 18);
      const t = f + rate * n;
      return {
        domain: "Algebra", skill: "Линейные модели", difficulty: 2,
        stem: `Такси берёт ${f} тыс. сум за посадку и ${rate} тыс. сум за каждый километр. Поездка стоила ${t} тыс. сум. Сколько километров длилась поездка?`,
        correct: n, spr: true,
        explanation: `${f} + ${rate}n = ${t} → ${rate}n = ${t - f} → n = ${n}.`,
        hint: "Составьте уравнение: посадка + тариф × километры = стоимость.",
      };
    },
  },
  {
    key: "quadsum",
    make: (r) => {
      let p = int(r, -9, 9), q = int(r, -9, 9);
      if (p === 0) p = 4; if (q === 0) q = -3; if (p === q) q = p + 2;
      const s = p + q, pr = p * q;
      const bTerm = s === 0 ? "" : ` ${s > 0 ? "−" : "+"} ${Math.abs(s) === 1 ? "" : Math.abs(s)}x`;
      const cTerm = pr === 0 ? "" : ` ${sg(pr)}`;
      return {
        domain: "Advanced Math", skill: "Квадратные уравнения", difficulty: 2,
        stem: `Чему равна сумма всех решений уравнения x²${bTerm}${cTerm} = 0?`,
        correct: s, distractors: [-s === s ? s + 1 : -s, pr === s ? pr + 3 : pr, p - q === s ? p - q + 5 : p - q],
        explanation: `Разложим на множители: (x ${sg(-p)})(x ${sg(-q)}) = 0. Решения ${num(p)} и ${num(q)}, их сумма ${num(s)}. По теореме Виета сумма корней x² + bx + c = 0 равна −b.`,
        hint: "Сумма корней x² + bx + c = 0 равна −b.",
        fmt: (v) => num(Number(v)),
      };
    },
  },
  {
    key: "percent",
    make: (r) => {
      const P = pick(r, [400, 800, 1200, 2000, 1600]);
      const up = pick(r, [10, 20, 25, 50]), down = pick(r, [10, 20, 25, 50]);
      const fin = (P * (100 + up) * (100 - down)) / 10000;
      if (!Number.isInteger(fin)) return null;
      const naive = (P * (100 + up - down)) / 100;
      return {
        domain: "Problem-Solving and Data Analysis", skill: "Проценты", difficulty: 2,
        stem: `Цена товара была ${P} тыс. сум. Её повысили на ${up}%, а затем новую цену снизили на ${down}%. Какой стала цена (в тыс. сум)?`,
        correct: fin, distractors: [naive === fin ? fin + 40 : naive, (P * (100 + up)) / 100, P === fin ? P + 20 : P],
        explanation: `${P} × ${(100 + up) / 100} = ${(P * (100 + up)) / 100}; затем × ${(100 - down) / 100} = ${fin}. Проценты нельзя просто складывать: второе изменение считается от новой цены.`,
        hint: "Каждое изменение умножает текущую цену на свой коэффициент.",
      };
    },
  },
  {
    key: "mean",
    make: (r) => {
      const M = int(r, 10, 30), N = M + int(r, 1, 6);
      const ans = 6 * N - 5 * M;
      return {
        domain: "Problem-Solving and Data Analysis", skill: "Среднее значение", difficulty: 2,
        stem: `Среднее арифметическое пяти чисел равно ${M}. Какое число нужно добавить к ним, чтобы среднее шести чисел стало равно ${N}?`,
        correct: ans, spr: true,
        explanation: `Сумма пяти чисел = 5 × ${M} = ${5 * M}. Нужная сумма шести = 6 × ${N} = ${6 * N}. Добавить: ${6 * N} − ${5 * M} = ${ans}.`,
        hint: "Работайте с суммами, а не со средними.",
      };
    },
  },
  {
    key: "circle",
    make: (r) => {
      const rad = int(r, 3, 12);
      return {
        domain: "Geometry and Trigonometry", skill: "Окружность", difficulty: 2,
        stem: `Длина окружности равна ${2 * rad}π. Площадь круга равна kπ. Чему равно k?`,
        correct: rad * rad, distractors: [2 * rad, 4 * rad * rad, rad],
        explanation: `2πr = ${2 * rad}π → r = ${rad}. Площадь πr² = ${rad * rad}π, k = ${rad * rad}.`,
        hint: "Из длины окружности найдите радиус.",
      };
    },
  },
  {
    key: "rect",
    make: (r) => {
      const L = int(r, 6, 20), W = int(r, 2, L - 1);
      const P = 2 * (L + W);
      return {
        domain: "Geometry and Trigonometry", skill: "Площадь и периметр", difficulty: 2,
        stem: `Периметр прямоугольника равен ${P} см, его длина ${L} см. Какова площадь прямоугольника в см²?`,
        correct: L * W, distractors: [L + W, 2 * L * W, L * L],
        explanation: `Ширина = ${P}/2 − ${L} = ${W}. Площадь = ${L} × ${W} = ${L * W}.`,
        hint: "Полупериметр равен длине плюс ширине.",
      };
    },
  },
  {
    key: "exp",
    make: (r) => {
      const a = int(r, 3, 7), b = int(r, 2, 6);
      if (a === b) return null;
      return {
        domain: "Advanced Math", skill: "Степени", difficulty: 2,
        stem: `Если 2ᵃ = ${2 ** a} и 2ᵇ = ${2 ** b}, чему равно a + b?`,
        correct: a + b, distractors: [a * b === a + b ? a * b + 1 : a * b, Math.abs(a - b) === a + b ? 1 : Math.abs(a - b), a + b + 1],
        explanation: `${2 ** a} = 2^${a}, ${2 ** b} = 2^${b}, значит a + b = ${a + b}.`,
        hint: "Представьте числа как степени двойки.",
      };
    },
  },
  {
    key: "vertex",
    make: (r) => {
      const a = pick(r, [1, 2, 3]), h = int(r, -6, 6), k = int(r, -12, 15);
      const b = -2 * a * h, c = a * h * h + k;
      const bT = b === 0 ? "" : ` ${b < 0 ? "−" : "+"} ${Math.abs(b)}x`;
      return {
        domain: "Advanced Math", skill: "Квадратичные функции", difficulty: 3,
        stem: `Функция задана формулой f(x) = ${a === 1 ? "" : a}x²${bT} ${sg(c)}. Чему равно наименьшее значение f(x)?`,
        correct: k, spr: true,
        explanation: `Вершина параболы: x = −b/(2a) = ${num(h)}. f(${num(h)}) = ${num(k)}. Это минимум, так как a > 0. В вершинной форме: f(x) = ${a === 1 ? "" : a}(x ${sg(-h)})² ${sg(k)}.`,
        hint: "Минимум параболы с a > 0 — в вершине x = −b/(2a).",
      };
    },
  },
  {
    key: "compose",
    make: (r) => {
      const a = int(r, 2, 5), b = int(r, -6, 7), c = int(r, 1, 9), n = int(r, 2, 5);
      const g = n * n - c, ans = a * g + b;
      const fg = a * n + b, gf = fg * fg - c;
      return {
        domain: "Advanced Math", skill: "Композиция функций", difficulty: 3,
        stem: `f(x) = ${a}x ${sg(b)} и g(x) = x² − ${c}. Чему равно f(g(${n}))?`,
        correct: ans, distractors: [gf === ans ? ans + 3 : gf, g === ans ? g + 1 : g, a * n + b + g === ans ? ans - 2 : a * n + b + g],
        explanation: `g(${n}) = ${n * n} − ${c} = ${num(g)}. f(${num(g)}) = ${a}·${par(g)} ${sg(b)} = ${num(ans)}.`,
        hint: "Сначала вычислите внутреннюю функцию g.",
        fmt: (v) => num(Number(v)),
      };
    },
  },
  {
    key: "similar",
    make: (r) => {
      const [p, q] = pick(r, [[3, 2], [5, 2], [4, 3], [5, 3], [7, 4]] as const);
      const t = int(r, 2, 6), u = int(r, 2, 7);
      if (t === u) return null;
      return {
        domain: "Geometry and Trigonometry", skill: "Подобие треугольников", difficulty: 3,
        stem: `Треугольники ABC и DEF подобны (A↔D, B↔E, C↔F). AB = ${q * t}, DE = ${p * t}, BC = ${q * u}. Найдите EF.`,
        correct: p * u, distractors: [q * u + (p - q) * t, p * t === p * u ? p * u + 1 : p * t, q * u * p],
        explanation: `Коэффициент подобия DE/AB = ${p * t}/${q * t} = ${p}/${q}. EF = BC × ${p}/${q} = ${q * u} × ${p}/${q} = ${p * u}.`,
        hint: "Отношение соответствующих сторон одинаково.",
      };
    },
  },
  {
    key: "areaquad",
    make: (r) => {
      const w = int(r, 3, 15), d = int(r, 2, 9);
      return {
        domain: "Advanced Math", skill: "Квадратичные модели", difficulty: 3,
        stem: `Длина прямоугольника на ${d} м больше его ширины, а площадь равна ${w * (w + d)} м². Какова ширина прямоугольника в метрах?`,
        correct: w, spr: true,
        explanation: `w(w + ${d}) = ${w * (w + d)} → w² + ${d}w − ${w * (w + d)} = 0 → (w − ${w})(w + ${w + d}) = 0. Ширина положительна: w = ${w}.`,
        hint: "Обозначьте ширину w и составьте квадратное уравнение.",
      };
    },
  },
  {
    key: "nosol",
    make: (r) => {
      const a = int(r, 2, 6), b = int(r, 1, 5), c = int(r, 3, 20), m = pick(r, [2, 3]);
      const e = m * c + int(r, 1, 6);
      return {
        domain: "Algebra", skill: "Системы линейных уравнений", difficulty: 3,
        stem: `При каком значении k система не имеет решений?\n${a}x + ${b === 1 ? "" : b}y = ${c}\nkx + ${m * b}y = ${e}`,
        correct: m * a, spr: true,
        explanation: `Система не имеет решений, когда прямые параллельны: коэффициенты пропорциональны (k/${a} = ${m * b}/${b} = ${m}), а свободные члены — нет (${e} ≠ ${m}·${c}). k = ${m * a}.`,
        hint: "Нет решений = параллельные прямые: равные наклоны, разные свободные члены.",
      };
    },
  },
];

function toQuestion(key: string, seed: number, d: Draft, r: R): Question | null {
  const fmt = d.fmt ?? ((v: number | string) => String(v));
  const id = `m-${key}-${seed}`;
  if (d.spr) {
    return {
      id, exam: "sat", section: "math", domain: d.domain, skill: d.skill, difficulty: d.difficulty,
      stem: d.stem, answerType: "spr", answer: String(d.correct), explanation: d.explanation, hint: d.hint,
      source: "code", verified: true,
    };
  }
  const options = [d.correct, ...(d.distractors ?? [])].map((v) => fmt(v));
  // Ровно один верный ответ: все варианты должны различаться.
  if (new Set(options).size !== 4) return null;
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const choices = order.map((i) => options[i]);
  const answer = LETTERS[order.indexOf(0)];
  return {
    id, exam: "sat", section: "math", domain: d.domain, skill: d.skill, difficulty: d.difficulty,
    stem: d.stem, choices, answerType: "mcq", answer, explanation: d.explanation, hint: d.hint,
    source: "code", verified: true,
  };
}

export function buildMathBank(variantsPerTemplate = 16): Question[] {
  const out: Question[] = [];
  for (const t of TEMPLATES) {
    let made = 0;
    for (let seed = 1; made < variantsPerTemplate && seed < variantsPerTemplate * 6; seed++) {
      const r = rng(seed * 7919 + t.key.length * 104729 + t.key.charCodeAt(0));
      const d = t.make(r);
      if (!d) continue;
      const q = toQuestion(t.key, seed, d, r);
      if (!q) continue;
      if (out.some((o) => o.stem === q.stem)) continue;
      out.push(q);
      made++;
    }
  }
  return out;
}
