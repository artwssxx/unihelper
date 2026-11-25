// Вычисление выражений калькулятора: дерево → замыкание (быстро для тысяч точек графика).
// Значения: число, список чисел, точка, список точек. Списки транслируются поэлементно (как в Desmos).

import { BUILTINS, CalcError, type Cond, type Node } from "./parse";

export type Pt = { x: number; y: number };
export type Val = number | number[] | Pt | Pt[];
export type Env = Record<string, number>;
export type Fn = (env: Env) => Val;

export interface Defs {
  vars: Map<string, Node>;
  fns: Map<string, { params: string[]; body: Node }>;
}

/** Переменная не определена — интерфейс предложит добавить ползунок. */
export class Undefined extends CalcError {
  constructor(public name: string) {
    super(`Не определено: ${name}`);
  }
}

export const isPt = (v: unknown): v is Pt => typeof v === "object" && v !== null && !Array.isArray(v) && "x" in v;
const isList = (v: Val): v is number[] | Pt[] => Array.isArray(v);
const num = (v: Val): number => {
  if (typeof v === "number") return v;
  throw new CalcError(isPt(v) ? "Здесь нужна не точка, а число" : "Здесь нужен не список, а число");
};

function lift1(v: Val, f: (a: number) => number): Val {
  if (typeof v === "number") return f(v);
  if (isList(v)) return (v as unknown[]).map((x) => (typeof x === "number" ? f(x) : NaN));
  throw new CalcError("Функция не работает с точками");
}

function lift2(a: Val, b: Val, op: "+" | "-" | "*" | "/" | "^"): Val {
  const f = (x: number, y: number) => (op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : op === "/" ? x / y : x ** y);
  if (typeof a === "number" && typeof b === "number") return f(a, b);
  if (isPt(a) || isPt(b)) {
    if (isPt(a) && isPt(b) && (op === "+" || op === "-")) return { x: f(a.x, b.x), y: f(a.y, b.y) };
    if (isPt(a) && typeof b === "number" && op !== "^") return { x: f(a.x, b), y: f(a.y, b) };
    if (typeof a === "number" && isPt(b) && op === "*") return { x: a * b.x, y: a * b.y };
    throw new CalcError("Такое действие с точками не поддерживается");
  }
  if (isList(a) && isList(b)) {
    const n = Math.min(a.length, b.length);
    return Array.from({ length: n }, (_, i) => num(lift2(a[i] as number, b[i] as number, op)));
  }
  if (isList(a)) return (a as number[]).map((x) => f(x, b as number));
  return (b as number[]).map((y) => f(a as number, y));
}

const fact = (n: number) => {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
};
const gcd2 = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd2(b, a % b));
const flat = (vals: Val[]): number[] => vals.flatMap((v) => (isList(v) ? (v as number[]) : [num(v)]));
const mean = (l: number[]) => l.reduce((s, x) => s + x, 0) / l.length;
const variance = (l: number[]) => {
  const m = mean(l);
  return l.reduce((s, x) => s + (x - m) ** 2, 0) / (l.length - 1);
};
const median = (l: number[]) => {
  const s = [...l].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function builtin(name: string, args: Val[], deg: boolean, base?: number): Val {
  const toRad = deg ? Math.PI / 180 : 1;
  const fromRad = deg ? 180 / Math.PI : 1;
  const one = (f: (a: number) => number) => {
    if (args.length !== 1) throw new CalcError(`${name}: нужен один аргумент`);
    return lift1(args[0], f);
  };
  switch (name) {
    case "sin": return one((a) => Math.sin(a * toRad));
    case "cos": return one((a) => Math.cos(a * toRad));
    case "tan": return one((a) => Math.tan(a * toRad));
    case "sec": return one((a) => 1 / Math.cos(a * toRad));
    case "csc": return one((a) => 1 / Math.sin(a * toRad));
    case "cot": return one((a) => 1 / Math.tan(a * toRad));
    case "asin": case "arcsin": return one((a) => Math.asin(a) * fromRad);
    case "acos": case "arccos": return one((a) => Math.acos(a) * fromRad);
    case "atan": case "arctan": return one((a) => Math.atan(a) * fromRad);
    case "sinh": return one(Math.sinh);
    case "cosh": return one(Math.cosh);
    case "tanh": return one(Math.tanh);
    case "sqrt": return one(Math.sqrt);
    case "cbrt": return one(Math.cbrt);
    case "abs": return one(Math.abs);
    case "ln": return one(Math.log);
    case "log":
      if (args.length === 2) return lift2(lift1(args[0], Math.log), lift1(args[1], Math.log), "/");
      return one((a) => (base ? Math.log(a) / Math.log(base) : Math.log10(a)));
    case "exp": return one(Math.exp);
    case "floor": return one(Math.floor);
    case "ceil": return one(Math.ceil);
    case "round":
      if (args.length === 2) { const p = 10 ** num(args[1]); return lift1(args[0], (a) => Math.round(a * p) / p); }
      return one(Math.round);
    case "sign": return one(Math.sign);
    case "nthroot": {
      const n = num(args[1] ?? 2);
      return lift1(args[0], (a) => (a < 0 && n % 2 === 1 ? -((-a) ** (1 / n)) : a ** (1 / n)));
    }
    case "mod": {
      const m = num(args[1]);
      return lift1(args[0], (a) => ((a % m) + m) % m);
    }
    case "gcd": return flat(args).reduce((a, b) => gcd2(a, b));
    case "lcm": return flat(args).reduce((a, b) => Math.abs(a * b) / gcd2(a, b));
    case "ncr": { const [n, r] = [num(args[0]), num(args[1])]; return fact(n) / (fact(r) * fact(n - r)); }
    case "npr": { const [n, r] = [num(args[0]), num(args[1])]; return fact(n) / fact(n - r); }
    case "min": return Math.min(...flat(args));
    case "max": return Math.max(...flat(args));
    case "mean": return mean(flat(args));
    case "median": return median(flat(args));
    case "stdev": case "stddev": return Math.sqrt(variance(flat(args)));
    case "var": return variance(flat(args));
    case "total": case "sum": return flat(args).reduce((s, x) => s + x, 0);
    case "length": return flat(args).length;
    case "sort": return [...flat(args)].sort((a, b) => a - b);
  }
  throw new CalcError(`Неизвестная функция ${name}`);
}

function compare(op: string, a: number, b: number): boolean {
  const eps = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b + eps : op === ">=" ? a >= b - eps : Math.abs(a - b) <= eps;
}

/** Компилятор с общими определениями (переменные и функции всех строк). */
export class Compiler {
  private vars = new Map<string, Val>();
  private busy = new Set<string>();
  private fns = new Map<string, (args: number[]) => Val>();
  private depth = 0;

  constructor(private defs: Defs, private deg = false) {}

  /** Значение переменной из определения «a = …» (вычисляется один раз). */
  varValue(name: string): Val {
    const cached = this.vars.get(name);
    if (cached !== undefined) return cached;
    const node = this.defs.vars.get(name);
    if (!node) throw new Undefined(name);
    if (this.busy.has(name)) throw new CalcError(`Определение ${name} ссылается само на себя`);
    this.busy.add(name);
    try {
      const v = this.compile(node, new Set())({});
      this.vars.set(name, v);
      return v;
    } finally {
      this.busy.delete(name);
    }
  }

  private userFn(name: string): (args: number[]) => Val {
    const c = this.fns.get(name);
    if (c) return c;
    const def = this.defs.fns.get(name)!;
    let body: Fn | null = null;
    const fn = (args: number[]) => {
      if (++this.depth > 200) { this.depth = 0; throw new CalcError(`Функция ${name} вызывает сама себя`); }
      try {
        body ??= this.compile(def.body, new Set(def.params));
        const env: Env = {};
        def.params.forEach((p, i) => (env[p] = args[i]));
        return body(env);
      } finally {
        this.depth--;
      }
    };
    this.fns.set(name, fn);
    return fn;
  }

  compile(n: Node, locals: Set<string>): Fn {
    switch (n.k) {
      case "num": { const v = n.v; return () => v; }
      case "id": {
        const name = n.name;
        if (locals.has(name)) return (env) => env[name];
        if (this.defs.vars.has(name)) { const v = this.varValue(name); return () => v; }
        if (name === "e") return () => Math.E;
        throw new Undefined(name);
      }
      case "neg": { const a = this.compile(n.a, locals); return (env) => lift1(a(env), (x) => -x); }
      case "fact": { const a = this.compile(n.a, locals); return (env) => lift1(a(env), fact); }
      case "abs": { const a = this.compile(n.a, locals); return (env) => { const v = a(env); return isPt(v) ? Math.hypot(v.x, v.y) : lift1(v, Math.abs); }; }
      case "bin": {
        const a = this.compile(n.a, locals), b = this.compile(n.b, locals), op = n.op;
        if (op === "*" || op === "+" || op === "-" || op === "/" || op === "^") return (env) => lift2(a(env), b(env), op);
        throw new CalcError("Ошибка в выражении");
      }
      case "list": {
        const items = n.items.map((x) => this.compile(x, locals));
        return (env) => {
          const vs = items.map((f) => f(env));
          if (vs.length && vs.every(isPt)) return vs as Pt[];
          return vs.map(num);
        };
      }
      case "range": {
        const from = this.compile(n.from, locals), to = this.compile(n.to, locals);
        return (env) => {
          const a = Math.ceil(num(from(env))), b = Math.floor(num(to(env)));
          if (b - a > 10000) throw new CalcError("Слишком длинный диапазон");
          return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
        };
      }
      case "point": {
        const x = this.compile(n.x, locals), y = this.compile(n.y, locals);
        return (env) => {
          const xv = x(env), yv = y(env);
          if (isList(xv) || isList(yv)) {
            const xs = isList(xv) ? (xv as number[]) : null, ys = isList(yv) ? (yv as number[]) : null;
            const len = Math.min(xs?.length ?? Infinity, ys?.length ?? Infinity);
            return Array.from({ length: len }, (_, i) => ({ x: xs ? xs[i] : num(xv), y: ys ? ys[i] : num(yv) }));
          }
          return { x: num(xv), y: num(yv) };
        };
      }
      case "piece": {
        const cases = n.cases.map((c) => ({ cond: this.compileCond(c.cond, locals), then: c.then ? this.compile(c.then, locals) : null }));
        const other = n.other ? this.compile(n.other, locals) : null;
        return (env) => {
          for (const c of cases) if (c.cond(env)) return c.then ? c.then(env) : 1;
          return other ? other(env) : NaN;
        };
      }
      case "call": return this.compileCall(n, locals);
    }
  }

  compileCond(cond: Cond, locals: Set<string>): (env: Env) => boolean {
    const parts = cond.map((r) => ({ op: r.op, a: this.compile(r.a, locals), b: this.compile(r.b, locals) }));
    return (env) => parts.every((p) => compare(p.op, num(p.a(env)), num(p.b(env))));
  }

  private compileCall(n: Extract<Node, { k: "call" }>, locals: Set<string>): Fn {
    const args = n.args.map((a) => this.compile(a, locals));
    if (n.name === "d/dx") {
      const g = args[0];
      return (env) => {
        const x = env.x ?? NaN, h = 1e-5 * Math.max(1, Math.abs(x));
        return lift2(lift2(g({ ...env, x: x + h }), g({ ...env, x: x - h }), "-"), 2 * h, "/");
      };
    }
    if (BUILTINS.has(n.name)) {
      const base = n.base ? this.compile(n.base, locals) : null;
      const deg = this.deg;
      return (env) => builtin(n.name, args.map((a) => a(env)), deg, base ? num(base(env)) : undefined);
    }
    if (this.defs.fns.has(n.name)) {
      const fn = this.userFn(n.name);
      const primes = n.primes;
      const call = (xs: number[]) => fn(xs);
      return (env) => {
        const vals = args.map((a) => a(env));
        // f([1,2,3]) — по каждому элементу
        if (vals.length === 1 && isList(vals[0])) return (vals[0] as number[]).map((v) => num(derive(call, [v], primes)));
        return derive(call, vals.map(num), primes);
      };
    }
    // a(b+1), x(x+1) — умножение переменной на скобку
    if (n.primes === 0 && args.length === 1) {
      const self = this.compile({ k: "id", name: n.name }, locals);
      return (env) => lift2(self(env), args[0](env), "*");
    }
    if (args.length === 1 || n.primes) throw new Undefined(`${n.name}()`);
    throw new CalcError(`Функция ${n.name} не определена`);
  }
}

/** Производная по первому аргументу численно (центральная разность), до 2-го порядка. */
function derive(f: (a: number[]) => Val, a: number[], primes: number): Val {
  if (!primes) return f(a);
  const x = a[0], h = (primes === 1 ? 1e-5 : 1e-3) * Math.max(1, Math.abs(x));
  const at = (dx: number) => num(f([x + dx, ...a.slice(1)]));
  if (primes === 1) return (at(h) - at(-h)) / (2 * h);
  if (primes === 2) return (at(h) - 2 * at(0) + at(-h)) / (h * h);
  throw new CalcError("Поддерживаются производные до второго порядка");
}
