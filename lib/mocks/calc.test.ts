import { describe, expect, it } from "vitest";
import { compile, evaluate, parseLine, roots } from "./calc";

const v = (s: string, x = 0) => evaluate(compile(s), x);

describe("калькулятор SAT", () => {
  it("порядок действий, степень справа налево, унарный минус", () => {
    expect(v("2+3*4")).toBe(14);
    expect(v("2^3^2")).toBe(512);
    expect(v("-2^2")).toBe(-4);
    expect(v("(1,5+0.5)*2")).toBe(4);
    expect(v("10/4")).toBe(2.5);
  });
  it("неявное умножение, функции и константы", () => {
    expect(v("2x", 3)).toBe(6);
    expect(v("3(x+1)", 2)).toBe(9);
    expect(v("2pi")).toBeCloseTo(2 * Math.PI);
    expect(v("sqrt(16)+abs(-3)")).toBe(7);
    expect(v("x²+1", 3)).toBe(10);
    expect(v("2sin(0)")).toBe(0);
  });
  it("строка графика и числа", () => {
    expect(parseLine("y = 2x + 1").kind).toBe("fn");
    expect(parseLine("f(x)=x^2").kind).toBe("fn");
    expect(parseLine("3/4 + 2")).toMatchObject({ kind: "value", value: 2.75 });
    expect(parseLine("2+").kind).toBe("error");
    expect(parseLine("(1+2").kind).toBe("error");
    expect(parseLine("alert(1)").kind).toBe("error");
  });
  it("корни и пересечения", () => {
    const f = (x: number) => x * x - 5 * x + 6;
    expect(roots(f, -10, 10).map((r) => Math.round(r * 1e6) / 1e6)).toEqual([2, 3]);
    const g = (x: number) => 2 * x + 1 - (-x + 7);
    expect(roots(g, -10, 10)[0]).toBeCloseTo(2);
    expect(roots((x) => 1 / x, -5, 5)).toEqual([]);
  });
});
