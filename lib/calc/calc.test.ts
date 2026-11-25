import { describe, expect, it } from "vitest";
import { crossings, curvePois, extrema, regression, roots } from "./analysis";
import { Compiler, type Val } from "./evaluate";
import { buildModel, fmtVal, type Item, type Line } from "./model";
import { parse } from "./parse";

const lines = (...texts: string[]): Line[] => texts.map((text, i) => ({ id: String(i), kind: "expr", text, color: "#000" }));
const items = (...texts: string[]) => buildModel(lines(...texts)).items;
const val = (s: string, ...defs: string[]): Val => {
  const it = items(...defs, s).at(-1)!;
  if (it.t !== "value") throw new Error(`${s}: ${JSON.stringify(it)}`);
  return it.value;
};
const at = (it: Item, v: number) => (it.t === "curve" ? it.f(v) : NaN);

describe("калькулятор: вычисления", () => {
  it("порядок действий, степень справа налево, унарный минус, факториал", () => {
    expect(val("2+3*4")).toBe(14);
    expect(val("2^3^2")).toBe(512);
    expect(val("-2^2")).toBe(-4);
    expect(val("5!")).toBe(120);
    expect(val("10/4")).toBe(2.5);
  });
  it("неявное умножение, функции без скобок, модуль, константы", () => {
    expect(val("2pi")).toBeCloseTo(2 * Math.PI);
    expect(val("sqrt(16)+abs(-3)")).toBe(7);
    expect(val("|-3|+|2-5|")).toBe(6);
    expect(val("3(2+1)")).toBe(9);
    expect(val("cos 0 + ln e")).toBe(2);
    expect(val("log_2(8)")).toBeCloseTo(3);
    expect(val("log(1000)")).toBeCloseTo(3);
    expect(val("nthroot(-27, 3)")).toBeCloseTo(-3);
    expect(val("mod(-7, 3)")).toBe(2);
    expect(val("ncr(5,2)")).toBe(10);
  });
  it("переменные и функции из других строк, производная", () => {
    expect(val("a b", "a = 3", "b = a + 1")).toBe(12);
    expect(val("f(3)", "f(x) = x^2 - 4")).toBe(5);
    expect(val("f'(3)", "f(x) = x^2")).toBeCloseTo(6, 4);
    expect(val("g(2, 3)", "g(a, b) = a b + 1")).toBe(7);
  });
  it("списки и статистика", () => {
    expect(val("mean(L)", "L = [1, 2, 3, 4]")).toBe(2.5);
    expect(val("median([5, 1, 3, 2])")).toBe(2.5);
    expect(val("stdev([2,4,4,4,5,5,7,9])")).toBeCloseTo(2.138, 3);
    expect(val("total([1...10])")).toBe(55);
    expect(val("2[1, 2, 3]")).toEqual([2, 4, 6]);
  });
  it("градусы", () => {
    const c = new Compiler({ vars: new Map(), fns: new Map() }, true);
    expect(c.compile(parse("sin(30)").lhs, new Set())({}) as number).toBeCloseTo(0.5);
  });
});

describe("калькулятор: что рисовать", () => {
  it("графики y = f(x), x = g(y), неявные кривые, неравенства, точки", () => {
    const [y, bare, xg, vert, circle, ineq, pt, fdef] = items("y = 2x + 1", "x^2", "x = y^2", "x = 3", "x^2 + y^2 = 25", "y < 2x", "(1, 2)", "f(t) = t^3");
    expect(y.t).toBe("curve");
    expect(at(y, 2)).toBe(5);
    expect(at(bare, 3)).toBe(9);
    expect(xg).toMatchObject({ t: "curve", axis: "x" });
    expect(at(xg, 2)).toBe(4);
    expect(at(vert, 100)).toBe(3);
    expect(circle.t === "implicit" && circle.F(3, 4)).toBe(0);
    expect(ineq).toMatchObject({ t: "implicit", op: "<" });
    expect(pt).toMatchObject({ t: "points", pts: [{ x: 1, y: 2 }] });
    expect(at(fdef, 2)).toBe(8);
  });
  it("ползунок, ограничения и кусочные функции", () => {
    const [a, line] = items("a = 2", "y = a x");
    expect(a).toMatchObject({ t: "var", name: "a", slider: true });
    expect(at(line, 3)).toBe(6);
    const [restricted, piece] = items("y = x^2 {x > 0}", "y = {x < 0: -x, x}");
    expect(at(restricted, -1)).toBeNaN();
    expect(at(restricted, 2)).toBe(4);
    expect(at(piece, -3)).toBe(3);
    expect(at(piece, 3)).toBe(3);
  });
  it("ошибки понятные: неизвестная переменная, лишняя скобка, повтор имени", () => {
    expect(items("y = k x").at(-1)).toMatchObject({ t: "error", missing: "k" });
    expect(items("(1+2").at(-1)).toMatchObject({ t: "error" });
    expect(items("a = 1", "a = 2").at(-1)).toMatchObject({ t: "error" });
    expect(items("alert(1)").at(-1)).toMatchObject({ t: "error" });
    expect(fmtVal([1, 2.5])).toBe("[1, 2.5]");
  });
});

describe("калькулятор: анализ и регрессия", () => {
  it("корни, экстремумы, пересечения", () => {
    const f = (x: number) => x * x - 5 * x + 6;
    expect(roots(f, -10, 10).map((r) => Math.round(r * 1e6) / 1e6)).toEqual([2, 3]);
    expect(roots((x) => 1 / x, -5, 5)).toEqual([]);
    const ex = extrema(f, -10, 10);
    expect(ex).toHaveLength(1);
    expect(ex[0].kind).toBe("min");
    expect(ex[0].x).toBeCloseTo(2.5, 4);
    expect(curvePois(f, -10, 10).find((p) => p.kind === "yint")?.y).toBe(6);
    expect(crossings((x) => 2 * x + 1, (x) => -x + 7, -10, 10)[0].x).toBeCloseTo(2);
  });
  it("линейная, квадратичная и экспоненциальная регрессия", () => {
    const lin = regression([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }], "linear")!;
    expect(lin.params[0]).toBeCloseTo(2);
    expect(lin.params[1]).toBeCloseTo(1);
    expect(lin.r2).toBeCloseTo(1);
    const q = regression([-2, -1, 0, 1, 2].map((x) => ({ x, y: x * x - 1 })), "quadratic")!;
    expect(q.params.map((p) => Math.round(p * 1e6) / 1e6)).toEqual([1, 0, -1]);
    const e = regression([0, 1, 2, 3].map((x) => ({ x, y: 3 * 2 ** x })), "exponential")!;
    expect(e.params[0]).toBeCloseTo(3);
    expect(e.params[1]).toBeCloseTo(2);
    expect(items(lin.formula)[0].t).toBe("curve");
    expect(items(e.formula)[0].t).toBe("curve");
  });
});

describe("калькулятор: как в Desmos", () => {
  it("2e-1 — это 2·e − 1, а не научная запись", () => {
    expect(val("2e-1")).toBeCloseTo(2 * Math.E - 1);
  });
});
