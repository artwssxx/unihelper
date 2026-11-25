// Разбор выражений графического калькулятора (уровня Desmos) в дерево. Без eval.
// Поддерживает: числа, переменные с индексом (a_1, x_1), неявное умножение (2x, 3(x+1), xy),
// степени, факториал, |x|, списки [1,2,3] и диапазоны [1...5], точки (a, b), кусочные функции
// {x<0: -x, x} и ограничения {x>0}, производные f'(x), log_2(x), сравнения = < > ≤ ≥.

export type Node =
  | { k: "num"; v: number }
  | { k: "id"; name: string }
  | { k: "call"; name: string; args: Node[]; primes: number; base?: Node }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "fact"; a: Node }
  | { k: "abs"; a: Node }
  | { k: "list"; items: Node[] }
  | { k: "range"; from: Node; to: Node }
  | { k: "point"; x: Node; y: Node }
  | { k: "piece"; cases: { cond: Cond; then: Node | null }[]; other: Node | null };

export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type Cond = { op: RelOp; a: Node; b: Node }[]; // цепочка: 0 < x < 2
export type Statement = { lhs: Node; op: RelOp | "~" | null; rhs: Node | null };

export class CalcError extends Error {}

/** Встроенные функции (имена из нескольких букв). Остальные буквы — переменные по одной. */
export const BUILTINS = new Set([
  "sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "sqrt", "cbrt", "nthroot", "abs", "ln", "log", "exp", "floor", "ceil", "round", "sign",
  "min", "max", "gcd", "lcm", "mod", "ncr", "npr", "mean", "median", "stdev", "stddev", "var", "total", "sum", "length", "sort",
]);
const CONSTS = new Set(["pi", "tau"]);

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string } | { t: "end" };

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/[×·∙]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-")
    .replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/π/g, " pi ").replace(/τ/g, " tau ").replace(/√/g, " sqrt ")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/…/g, "...");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (s.startsWith("d/dx", i)) { out.push({ t: "op", v: "d/dx" }); i += 4; continue; }
    if (/[0-9.]/.test(c) && !s.startsWith("...", i)) {
      const m = s.slice(i).match(/^(\d+(?:\.(?!\.)\d*)?|\.\d+)/)!; // «1...5» — точка диапазона не часть числа
      if (!m) throw new CalcError("Неверное число");
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/i.test(s[j])) j++;
      let word = s.slice(i, j).toLowerCase();
      i = j;
      // Длинное слово: встроенные функции и константы, остальное — переменные по одной букве (xy = x·y).
      while (word) {
        const fn = [...BUILTINS, ...CONSTS].filter((f) => word.startsWith(f)).sort((a, b) => b.length - a.length)[0];
        if (fn) { out.push({ t: "id", v: fn }); word = word.slice(fn.length); continue; }
        let name = word[0];
        word = word.slice(1);
        // Индекс: a_1, x_2, a_{12}, log_2
        if (!word && s[i] === "_") {
          const m = s.slice(i).match(/^_\{?([a-z0-9]+)\}?/i);
          if (m) { name += "_" + m[1].toLowerCase(); i += m[0].length; }
        }
        out.push({ t: "id", v: name });
      }
      // log_2(x) / log_b(x): индекс после log
      const last = out[out.length - 1];
      if (last.t === "id" && last.v === "log" && s[i] === "_") {
        const m = s.slice(i).match(/^_\{?([a-z0-9.]+)\}?/i)!;
        out.push({ t: "op", v: "_" });
        out.push(/^[\d.]+$/.test(m[1]) ? { t: "num", v: Number(m[1]) } : { t: "id", v: m[1].toLowerCase() });
        i += m[0].length;
      }
      continue;
    }
    const two = s.slice(i, i + 3) === "..." ? "..." : s.slice(i, i + 2);
    if (["...", "<=", ">="].includes(two)) { out.push({ t: "op", v: two }); i += two.length; continue; }
    if ("+-*/^!()[]{},:=<>|'~".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new CalcError(`Неожиданный символ «${c}»`);
  }
  out.push({ t: "end" });
  return out;
}

class Parser {
  private p = 0;
  private absDepth = 0;
  constructor(private toks: Tok[]) {}
  private peek(o = 0) { return this.toks[this.p + o]; }
  private isOp(v: string, o = 0) { const t = this.peek(o); return t.t === "op" && t.v === v; }
  private eat(v: string) {
    if (!this.isOp(v)) throw new CalcError(v === ")" ? "Не закрыта скобка" : `Ожидается «${v}»`);
    this.p++;
  }

  statement(): Statement {
    const lhs = this.expr();
    const t = this.peek();
    if (t.t === "op" && ["=", "<", ">", "<=", ">=", "~"].includes(t.v)) {
      this.p++;
      const rhs = this.expr();
      if (this.peek().t !== "end") throw new CalcError("Лишние символы в конце");
      return { lhs, op: t.v as RelOp | "~", rhs };
    }
    if (t.t !== "end") throw new CalcError(this.isOp(")") ? "Лишняя закрывающая скобка" : "Ошибка в выражении");
    return { lhs, op: null, rhs: null };
  }

  expr(): Node {
    let a = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.peek() as { v: "+" | "-" }).v;
      this.p++;
      a = { k: "bin", op, a, b: this.term() };
    }
    return a;
  }

  // Умножение, деление и неявное умножение (2x, x(…), (…)(…), 2sin x)
  term(): Node {
    let a = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.peek() as { v: "*" | "/" }).v;
        this.p++;
        a = { k: "bin", op, a, b: this.unary() };
      } else if (this.startsPrimary()) {
        a = { k: "bin", op: "*", a, b: this.power() };
      } else return a;
    }
  }

  private startsPrimary() {
    const t = this.peek();
    if (t.t === "num" || t.t === "id") return true;
    if (t.t !== "op") return false;
    if (t.v === "(" || t.v === "[" || t.v === "{" || t.v === "d/dx") return true;
    // «|» открывает модуль, только если мы не внутри модуля, который он закрывает
    return t.v === "|" && this.absDepth === 0;
  }

  unary(): Node {
    if (this.isOp("-")) { this.p++; return { k: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.p++; return this.unary(); }
    return this.power();
  }

  power(): Node {
    const base = this.postfix();
    if (this.isOp("^")) {
      this.p++;
      return { k: "bin", op: "^", a: base, b: this.unary() }; // справа налево: 2^3^2 = 2^9
    }
    return base;
  }

  postfix(): Node {
    let a = this.primary();
    while (this.isOp("!")) { this.p++; a = { k: "fact", a }; }
    return a;
  }

  primary(): Node {
    const t = this.peek();
    if (t.t === "num") { this.p++; return { k: "num", v: t.v }; }
    if (t.t === "id") return this.identifier();
    if (t.t === "op") {
      if (t.v === "(") {
        this.p++;
        const a = this.expr();
        if (this.isOp(",")) {
          this.p++;
          const b = this.expr();
          this.eat(")");
          return { k: "point", x: a, y: b };
        }
        this.eat(")");
        return a;
      }
      if (t.v === "[") {
        this.p++;
        const items: Node[] = [];
        if (!this.isOp("]")) {
          const first = this.expr();
          if (this.isOp("...")) {
            this.p++;
            const to = this.expr();
            this.eat("]");
            return { k: "range", from: first, to };
          }
          items.push(first);
          while (this.isOp(",")) { this.p++; items.push(this.expr()); }
        }
        this.eat("]");
        return { k: "list", items };
      }
      if (t.v === "|") {
        this.p++;
        this.absDepth++;
        const a = this.expr();
        this.absDepth--;
        this.eat("|");
        return { k: "abs", a };
      }
      if (t.v === "{") return this.piecewise();
      if (t.v === "d/dx") {
        this.p++;
        return { k: "call", name: "d/dx", args: [this.unary()], primes: 0 };
      }
    }
    throw new CalcError(t.t === "end" ? "Выражение не закончено" : "Ошибка в выражении");
  }

  private identifier(): Node {
    const name = (this.peek() as { v: string }).v;
    this.p++;
    if (name === "pi") return { k: "num", v: Math.PI };
    if (name === "tau") return { k: "num", v: 2 * Math.PI };
    let base: Node | undefined;
    if (name === "log" && this.isOp("_")) {
      this.p++;
      base = this.primary();
    }
    let primes = 0;
    while (this.isOp("'")) { this.p++; primes++; }
    const builtin = BUILTINS.has(name);
    if (this.isOp("(") && (builtin || primes || /^[a-z](_\w+)?$/.test(name))) {
      this.p++;
      const args: Node[] = [];
      if (!this.isOp(")")) {
        args.push(this.expr());
        while (this.isOp(",")) { this.p++; args.push(this.expr()); }
      }
      this.eat(")");
      // f(2, 3) у переменной без определения — это точка, решаем при вычислении
      return { k: "call", name, args, primes, base };
    }
    if (builtin) {
      // sin x, cos 2x, ln x — аргумент без скобок: произведение до знака +/- или следующей функции (sin x cos x)
      let arg = this.power();
      while (this.startsPrimary() && !(this.peek().t === "id" && BUILTINS.has((this.peek() as { v: string }).v))) {
        arg = { k: "bin", op: "*", a: arg, b: this.power() };
      }
      return { k: "call", name, args: [arg], primes: 0, base };
    }
    if (primes) throw new CalcError("После штриха нужны скобки: f'(x)");
    return { k: "id", name };
  }

  private piecewise(): Node {
    this.eat("{");
    const cases: { cond: Cond; then: Node | null }[] = [];
    let other: Node | null = null;
    for (;;) {
      const first = this.expr();
      const t = this.peek();
      if (t.t === "op" && ["<", ">", "<=", ">=", "="].includes(t.v)) {
        const cond: Cond = [];
        let left = first;
        while (this.peek().t === "op" && ["<", ">", "<=", ">=", "="].includes((this.peek() as { v: string }).v)) {
          const op = (this.peek() as { v: RelOp }).v;
          this.p++;
          const right = this.expr();
          cond.push({ op, a: left, b: right });
          left = right;
        }
        let then: Node | null = null;
        if (this.isOp(":")) { this.p++; then = this.expr(); }
        cases.push({ cond, then });
      } else {
        other = first;
      }
      if (this.isOp(",")) { this.p++; continue; }
      this.eat("}");
      return { k: "piece", cases, other };
    }
  }
}

export function parse(src: string): Statement {
  if (!src.trim()) throw new CalcError("Пустое выражение");
  return new Parser(tokenize(src)).statement();
}

/** Все имена переменных в дереве (без x, y и параметров). */
export function freeVars(n: Node | null, out = new Set<string>()): Set<string> {
  if (!n) return out;
  switch (n.k) {
    case "id": out.add(n.name); break;
    case "call":
      if (!BUILTINS.has(n.name) && n.name !== "d/dx") out.add(n.name + "()");
      n.args.forEach((a) => freeVars(a, out));
      if (n.base) freeVars(n.base, out);
      break;
    case "neg": case "fact": case "abs": freeVars(n.a, out); break;
    case "bin": freeVars(n.a, out); freeVars(n.b, out); break;
    case "list": n.items.forEach((a) => freeVars(a, out)); break;
    case "range": freeVars(n.from, out); freeVars(n.to, out); break;
    case "point": freeVars(n.x, out); freeVars(n.y, out); break;
    case "piece":
      n.cases.forEach((c) => { c.cond.forEach((r) => { freeVars(r.a, out); freeVars(r.b, out); }); freeVars(c.then, out); });
      freeVars(n.other, out);
      break;
  }
  return out;
}
