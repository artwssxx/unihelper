// Разбор и вычисление выражений для калькулятора SAT (аналог встроенного графического калькулятора).
// Без eval: токены → обратная польская запись → вычисление. Поддерживает x, π, e, ^, функции и неявное умножение (2x, 3(x+1)).

type Tok = { t: "num"; v: number } | { t: "var" } | { t: "const"; v: number } | { t: "fn"; v: string } | { t: "op"; v: string } | { t: "(" } | { t: ")" };

const FNS: Record<string, (a: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
};
const CONSTS: Record<string, number> = { pi: Math.PI, "π": Math.PI, e: Math.E };
const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };

export class CalcError extends Error {}

function tokenize(src: string): Tok[] {
  const s = src.replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      const v = Number(s.slice(i, j).replace(",", "."));
      if (!Number.isFinite(v)) throw new CalcError("Неверное число");
      out.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zπ]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-zπ]/i.test(s[j])) j++;
      let word = s.slice(i, j).toLowerCase();
      i = j;
      // Слитные «xsin», «pix» и т. п. разбираем жадно слева направо.
      while (word) {
        const fn = Object.keys(FNS).sort((a, b) => b.length - a.length).find((f) => word.startsWith(f));
        if (fn) { out.push({ t: "fn", v: fn }); word = word.slice(fn.length); continue; }
        if (word.startsWith("pi")) { out.push({ t: "const", v: Math.PI }); word = word.slice(2); continue; }
        const ch = word[0];
        if (ch === "x") out.push({ t: "var" });
        else if (ch in CONSTS) out.push({ t: "const", v: CONSTS[ch] });
        else throw new CalcError(`Неизвестное обозначение «${ch}»`);
        word = word.slice(1);
      }
      continue;
    }
    if ("+-*/^".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    if (c === "(" || c === "[") { out.push({ t: "(" }); i++; continue; }
    if (c === ")" || c === "]") { out.push({ t: ")" }); i++; continue; }
    throw new CalcError(`Неожиданный символ «${c}»`);
  }
  // Неявное умножение: 2x, 2(…), x(…), )(…), )x, x sin(…)
  const res: Tok[] = [];
  for (const tk of out) {
    const prev = res[res.length - 1];
    const prevEnds = prev && (prev.t === "num" || prev.t === "var" || prev.t === "const" || prev.t === ")");
    const curStarts = tk.t === "num" || tk.t === "var" || tk.t === "const" || tk.t === "fn" || tk.t === "(";
    if (prevEnds && curStarts) res.push({ t: "op", v: "*" });
    res.push(tk);
  }
  return res;
}

type Rpn = (Tok | { t: "op"; v: "neg" })[];

export function compile(src: string): Rpn {
  const toks = tokenize(src);
  const out: Rpn = [];
  const st: (Tok | { t: "op"; v: "neg" })[] = [];
  let prev: Tok | null = null;
  for (const tk of toks) {
    if (tk.t === "num" || tk.t === "var" || tk.t === "const") out.push(tk);
    else if (tk.t === "fn") st.push(tk);
    else if (tk.t === "op") {
      const unary = (tk.v === "-" || tk.v === "+") && (!prev || prev.t === "op" || prev.t === "(");
      if (unary) {
        if (tk.v === "-") st.push({ t: "op", v: "neg" });
      } else {
        while (st.length) {
          const top = st[st.length - 1];
          if (top.t === "fn" || (top.t === "op" && (PREC[top.v] > PREC[tk.v] || (PREC[top.v] === PREC[tk.v] && tk.v !== "^")))) out.push(st.pop()!);
          else break;
        }
        st.push(tk);
      }
    } else if (tk.t === "(") st.push(tk);
    else {
      while (st.length && st[st.length - 1].t !== "(") out.push(st.pop()!);
      if (!st.length) throw new CalcError("Лишняя закрывающая скобка");
      st.pop();
      if (st.length && st[st.length - 1].t === "fn") out.push(st.pop()!);
    }
    prev = tk;
  }
  while (st.length) {
    const t = st.pop()!;
    if (t.t === "(") throw new CalcError("Не закрыта скобка");
    out.push(t);
  }
  if (!out.length) throw new CalcError("Пустое выражение");
  // пробное вычисление — ловим «2+» и т. п.
  run(out, 1);
  return out;
}

function run(rpn: Rpn, x: number): number {
  const s: number[] = [];
  for (const t of rpn) {
    if (t.t === "num" || t.t === "const") s.push(t.v);
    else if (t.t === "var") s.push(x);
    else if (t.t === "fn") {
      if (!s.length) throw new CalcError("Нет аргумента функции");
      s.push(FNS[t.v](s.pop()!));
    } else if (t.t === "op") {
      if (t.v === "neg") {
        if (!s.length) throw new CalcError("Ошибка в выражении");
        s.push(-s.pop()!);
        continue;
      }
      const b = s.pop(), a = s.pop();
      if (a === undefined || b === undefined) throw new CalcError("Ошибка в выражении");
      s.push(t.v === "+" ? a + b : t.v === "-" ? a - b : t.v === "*" ? a * b : t.v === "/" ? a / b : a ** b);
    }
  }
  if (s.length !== 1) throw new CalcError("Ошибка в выражении");
  return s[0];
}

export const evaluate = (rpn: Rpn, x: number) => run(rpn, x);

export interface Parsed {
  kind: "fn" | "value" | "empty" | "error";
  rpn?: Rpn;
  value?: number;
  error?: string;
}

/** «y = 2x + 1», «f(x) = x^2», «3/4 + 2» → функция от x или число. */
export function parseLine(src: string): Parsed {
  const s = src.trim();
  if (!s) return { kind: "empty" };
  const body = s.replace(/^\s*(y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\))\s*=\s*/i, "");
  try {
    const rpn = compile(body);
    const usesX = rpn.some((t) => t.t === "var");
    return usesX ? { kind: "fn", rpn } : { kind: "value", rpn, value: run(rpn, 0) };
  } catch (e) {
    return { kind: "error", error: e instanceof CalcError ? e.message : "Ошибка в выражении" };
  }
}

/** Корни f(x) = 0 на отрезке: перебор смены знака + деление пополам. */
export function roots(f: (x: number) => number, a: number, b: number, steps = 600): number[] {
  const out: number[] = [];
  const dx = (b - a) / steps;
  let x0 = a, y0 = f(x0);
  for (let i = 1; i <= steps; i++) {
    const x1 = a + i * dx, y1 = f(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) out.push(x0);
      else if (y0 * y1 < 0 && Math.abs(y1 - y0) < (Math.abs(y0) + Math.abs(y1)) * 1e3 + 1e6) {
        let lo = x0, hi = x1, flo = y0;
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2, fm = f(mid);
          if (flo * fm <= 0) hi = mid;
          else { lo = mid; flo = fm; }
        }
        const r = (lo + hi) / 2;
        if (Math.abs(f(r)) < 1e-6 * (1 + Math.abs(y0) + Math.abs(y1))) out.push(r);
      }
    }
    x0 = x1;
    y0 = y1;
  }
  return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > dx);
}

export const fmtNum = (v: number) => {
  if (!Number.isFinite(v)) return "не определено";
  const r = Math.round(v * 1e6) / 1e6;
  return String(Object.is(r, -0) ? 0 : r).replace(".", ",");
};
