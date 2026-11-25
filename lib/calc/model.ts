// Модель калькулятора: строки → определения (переменные и функции всех строк) → что рисовать в каждой строке.

import { Compiler, Undefined, isPt, type Defs, type Pt, type Val } from "./evaluate";
import { BUILTINS, CalcError, freeVars, parse, type Node, type RelOp, type Statement } from "./parse";

export type Slider = { min: number; max: number; step: number };
export interface ExprLine { id: string; kind: "expr"; text: string; color: string; hidden?: boolean; slider?: Slider }
export interface TableLine { id: string; kind: "table"; xs: string[]; ys: string[]; color: string; hidden?: boolean }
export type Line = ExprLine | TableLine;

export type Item =
  | { t: "empty" }
  | { t: "note" }
  | { t: "def" }
  | { t: "error"; msg: string; missing?: string }
  | { t: "value"; value: Val }
  | { t: "bool"; ok: boolean }
  | { t: "var"; name: string; value: Val; slider: boolean }
  /** y = f(x) (axis "y") или x = g(y) (axis "x"); значение может быть списком — тогда несколько графиков. */
  | { t: "curve"; axis: "y" | "x"; f: (v: number) => Val; def?: string }
  /** Неявное уравнение или неравенство: F(x, y) op 0, где F = левая − правая часть. */
  | { t: "implicit"; F: (x: number, y: number) => number; op: RelOp }
  | { t: "points"; pts: Pt[]; value: Val }
  | { t: "table"; pts: Pt[] };

const isId = (n: Node, name?: string): n is Extract<Node, { k: "id" }> => n.k === "id" && (!name || n.name === name);
const uses = (n: Node | null, name: string) => freeVars(n).has(name);
const isSliderNode = (n: Node) => n.k === "num" || (n.k === "neg" && n.a.k === "num");
const asNumber = (v: Val) => (typeof v === "number" ? v : NaN);

export interface Model {
  items: Item[];
  compiler: Compiler;
}

export function buildModel(lines: Line[], deg = false): Model {
  const parsed: (Statement | CalcError | null)[] = lines.map((l) => {
    if (l.kind !== "expr") return null;
    const s = l.text.trim();
    if (!s || s.startsWith('"') || s.startsWith("//")) return null;
    try {
      return parse(s);
    } catch (e) {
      return e instanceof CalcError ? e : new CalcError("Ошибка в выражении");
    }
  });

  // Определения: a = …, f(x) = … (повтор имени — ошибка у второй строки).
  const defs: Defs = { vars: new Map(), fns: new Map() };
  const dup = new Set<number>();
  parsed.forEach((st, i) => {
    if (!st || st instanceof CalcError || st.op !== "=" || !st.rhs) return;
    const { lhs, rhs } = st;
    if (isId(lhs) && lhs.name !== "x" && lhs.name !== "y" && !uses(rhs, lhs.name)) {
      if (defs.vars.has(lhs.name) || defs.fns.has(lhs.name)) dup.add(i);
      else defs.vars.set(lhs.name, rhs);
    } else if (lhs.k === "call" && !BUILTINS.has(lhs.name) && !lhs.primes && lhs.args.length && lhs.args.every((a) => isId(a))) {
      if (defs.fns.has(lhs.name) || defs.vars.has(lhs.name)) dup.add(i);
      else defs.fns.set(lhs.name, { params: lhs.args.map((a) => (a as { name: string }).name), body: rhs });
    }
  });

  const compiler = new Compiler(defs, deg);
  const items: Item[] = lines.map((l, i) => {
    if (l.kind === "table") return table(l, compiler);
    const st = parsed[i];
    if (st === null) return l.text.trim() ? { t: "note" } : { t: "empty" };
    if (st instanceof CalcError) return { t: "error", msg: st.message };
    if (dup.has(i)) return { t: "error", msg: "Это имя уже определено в другой строке" };
    try {
      return classify(st, compiler);
    } catch (e) {
      if (e instanceof Undefined) return { t: "error", msg: e.message, missing: e.name.endsWith("()") ? undefined : e.name };
      return { t: "error", msg: e instanceof CalcError ? e.message : "Ошибка в выражении" };
    }
  });
  return { items, compiler };
}

function classify(st: Statement, c: Compiler): Item {
  const xy = new Set(["x", "y"]);
  const { lhs, op, rhs } = st;
  if (op === null) {
    const fv = freeVars(lhs);
    if (fv.has("y")) throw new CalcError(fv.has("x") ? "Добавь знак: = или <" : "Начни с «x =»");
    if (fv.has("x")) return { t: "curve", axis: "y", f: curveFn(lhs, "x", c) };
    const value = c.compile(lhs, new Set())({});
    if (isPt(value) || (Array.isArray(value) && value.length > 0 && isPt(value[0]))) {
      return { t: "points", pts: (Array.isArray(value) ? value : [value]) as Pt[], value };
    }
    return { t: "value", value };
  }
  if (op === "~") throw new CalcError("Регрессия — в таблице: кнопка «Регрессия»");
  if (!rhs) throw new CalcError("Ошибка в выражении");

  if (op === "=") {
    if (isId(lhs, "y") && !uses(rhs, "y")) return { t: "curve", axis: "y", f: curveFn(rhs, "x", c) };
    if (isId(rhs, "y") && !uses(lhs, "y")) return { t: "curve", axis: "y", f: curveFn(lhs, "x", c) };
    if (isId(lhs, "x") && !uses(rhs, "x")) return { t: "curve", axis: "x", f: curveFn(rhs, "y", c) };
    if (isId(rhs, "x") && !uses(lhs, "x")) return { t: "curve", axis: "x", f: curveFn(lhs, "y", c) };
    if (isId(lhs) && !xy.has(lhs.name)) return { t: "var", name: lhs.name, value: c.varValue(lhs.name), slider: isSliderNode(rhs) };
    if (lhs.k === "call" && !BUILTINS.has(lhs.name) && lhs.args.every((a) => isId(a))) {
      // f(t) = … с одним параметром рисуем как график y = f(x); с несколькими — только определение
      if (lhs.args.length !== 1) return { t: "def" };
      const call: Node = { k: "call", name: lhs.name, args: [{ k: "id", name: "x" }], primes: 0 };
      return { t: "curve", axis: "y", f: curveFn(call, "x", c), def: lhs.name };
    }
  }
  const fv = new Set([...freeVars(lhs), ...freeVars(rhs)]);
  if (fv.has("x") || fv.has("y")) {
    const a = c.compile(lhs, xy), b = c.compile(rhs, xy);
    const F = (x: number, y: number) => asNumber(a({ x, y })) - asNumber(b({ x, y }));
    return { t: "implicit", F, op: op as RelOp };
  }
  if (op === "=") throw new CalcError("В уравнении нет x и y");
  const a = asNumber(c.compile(lhs, new Set())({})), b = asNumber(c.compile(rhs, new Set())({}));
  return { t: "bool", ok: op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b };
}

function curveFn(n: Node, v: "x" | "y", c: Compiler): (t: number) => Val {
  const f = c.compile(n, new Set([v]));
  f({ [v]: 0.5 }); // пробное вычисление: ловим неопределённые имена сразу
  return (t) => {
    try {
      return f({ [v]: t });
    } catch {
      return NaN;
    }
  };
}

function table(l: TableLine, c: Compiler): Item {
  const cell = (s: string) => {
    if (!s.trim()) return NaN;
    try {
      return asNumber(c.compile(parse(s).lhs, new Set())({}));
    } catch {
      return NaN;
    }
  };
  const pts: Pt[] = [];
  for (let i = 0; i < Math.max(l.xs.length, l.ys.length); i++) {
    const x = cell(l.xs[i] ?? ""), y = cell(l.ys[i] ?? "");
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
  }
  return { t: "table", pts };
}

/** Число для показа: до 6 значащих после запятой, без «-0». */
export function fmt(v: number): string {
  if (Number.isNaN(v)) return "не определено";
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "−∞";
  if (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(4).replace("e+", "·10^").replace("e-", "·10^-");
  const r = Math.round(v * 1e6) / 1e6;
  return String(Object.is(r, -0) ? 0 : r);
}

export function fmtVal(v: Val): string {
  if (typeof v === "number") return fmt(v);
  if (isPt(v)) return `(${fmt(v.x)}, ${fmt(v.y)})`;
  const list = v as (number | Pt)[];
  const shown = list.slice(0, 12).map((x) => (typeof x === "number" ? fmt(x) : `(${fmt(x.x)}, ${fmt(x.y)})`));
  return `[${shown.join(", ")}${list.length > 12 ? ", …" : ""}]`;
}
