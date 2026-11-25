// Особые точки графиков (как серые точки в Desmos): корни, пересечение с осью y, экстремумы,
// пересечения графиков. И регрессия по точкам таблицы.

export type Poi = { kind: "root" | "yint" | "min" | "max" | "cross"; x: number; y: number };

/** Корни f на [a, b]: смена знака + деление пополам; разрывы (1/x) отбрасываются. */
export function roots(f: (x: number) => number, a: number, b: number, steps = 800): number[] {
  const out: number[] = [];
  const dx = (b - a) / steps;
  let x0 = a, y0 = f(x0);
  for (let i = 1; i <= steps; i++) {
    const x1 = a + i * dx, y1 = f(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) out.push(x0);
      else if (y0 * y1 < 0) {
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

/** Локальные минимумы и максимумы на [a, b] (золотое сечение вокруг найденных по сетке). */
export function extrema(f: (x: number) => number, a: number, b: number, steps = 600): Poi[] {
  const dx = (b - a) / steps;
  const ys = Array.from({ length: steps + 1 }, (_, i) => f(a + i * dx));
  const out: Poi[] = [];
  for (let i = 1; i < steps; i++) {
    const [p, c, n] = [ys[i - 1], ys[i], ys[i + 1]];
    if (![p, c, n].every(Number.isFinite)) continue;
    const isMin = c < p && c <= n, isMax = c > p && c >= n;
    if (!isMin && !isMax) continue;
    // уточняем в [x-dx, x+dx]
    let lo = a + (i - 1) * dx, hi = a + (i + 1) * dx;
    const g = (x: number) => (isMin ? f(x) : -f(x));
    const r = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 50; k++) {
      const m1 = hi - r * (hi - lo), m2 = lo + r * (hi - lo);
      if (g(m1) < g(m2)) hi = m2;
      else lo = m1;
    }
    const x = (lo + hi) / 2, y = f(x);
    // не экстремум, а скачок у разрыва
    if (!Number.isFinite(y) || Math.abs(y - c) > Math.max(1, Math.abs(c)) * 0.5) continue;
    out.push({ kind: isMin ? "min" : "max", x, y });
  }
  return out;
}

export function curvePois(f: (x: number) => number, a: number, b: number): Poi[] {
  const out: Poi[] = roots(f, a, b).map((x) => ({ kind: "root" as const, x, y: 0 }));
  const y0 = f(0);
  if (0 >= a && 0 <= b && Number.isFinite(y0) && !out.some((p) => Math.abs(p.x) < 1e-9)) out.push({ kind: "yint", x: 0, y: y0 });
  return [...out, ...extrema(f, a, b)];
}

export function crossings(f: (x: number) => number, g: (x: number) => number, a: number, b: number): Poi[] {
  return roots((x) => f(x) - g(x), a, b).map((x) => ({ kind: "cross" as const, x, y: f(x) }));
}

export type RegKind = "linear" | "quadratic" | "exponential";
export type Fit = { kind: RegKind; params: number[]; r2: number; formula: string; f: (x: number) => number };

const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

function r2(xs: number[], ys: number[], f: (x: number) => number) {
  const m = sum(ys) / ys.length;
  const ssTot = sum(ys.map((y) => (y - m) ** 2));
  const ssRes = sum(xs.map((x, i) => (ys[i] - f(x)) ** 2));
  return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
}

/** Решение 3×3 (метод Гаусса) для квадратичной регрессии. */
function solve3(A: number[][], b: number[]): number[] | null {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j < 4; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((row, i) => row[3] / row[i]);
}

/** Регрессия методом наименьших квадратов. Экспонента — через логарифм y (нужны y > 0). */
export function regression(pts: { x: number; y: number }[], kind: RegKind): Fit | null {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), n = pts.length;
  if (kind === "linear") {
    if (n < 2) return null;
    const sx = sum(xs), sy = sum(ys), sxx = sum(xs.map((x) => x * x)), sxy = sum(xs.map((x, i) => x * ys[i]));
    const d = n * sxx - sx * sx;
    if (d === 0) return null;
    const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
    const f = (x: number) => m * x + b;
    return { kind, params: [m, b], r2: r2(xs, ys, f), formula: `y = ${round(m)}x + ${round(b)}`.replace("+ -", "- "), f };
  }
  if (kind === "quadratic") {
    if (n < 3) return null;
    const S = (p: number) => sum(xs.map((x) => x ** p));
    const T = (p: number) => sum(xs.map((x, i) => x ** p * ys[i]));
    const sol = solve3([[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), n]], [T(2), T(1), T(0)]);
    if (!sol) return null;
    const [a, b, c] = sol;
    const f = (x: number) => a * x * x + b * x + c;
    return { kind, params: sol, r2: r2(xs, ys, f), formula: `y = ${round(a)}x^2 + ${round(b)}x + ${round(c)}`.replace(/\+ -/g, "- "), f };
  }
  if (n < 2 || ys.some((y) => y <= 0)) return null;
  const lin = regression(pts.map((p) => ({ x: p.x, y: Math.log(p.y) })), "linear");
  if (!lin) return null;
  const [k, c] = lin.params;
  const a = Math.exp(c), b = Math.exp(k);
  const f = (x: number) => a * b ** x;
  return { kind, params: [a, b], r2: r2(xs, ys, f), formula: `y = ${round(a)}·${round(b)}^x`, f };
}
