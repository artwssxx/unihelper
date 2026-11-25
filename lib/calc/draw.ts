// Отрисовка графиков на canvas: сетка, явные графики, неявные кривые (marching squares),
// области неравенств, точки, особые точки и трассировка. Без React — чистая функция.

import type { Poi } from "./analysis";
import type { Pt, Val } from "./evaluate";
import { fmt, type Item, type Line } from "./model";

export type View = { cx: number; cy: number; scale: number }; // scale — пикселей на единицу
export type Theme = { ink: string; muted: string; grid: string; gridMinor: string; bg: string };
export type Trace = { x: number; y: number; color: string; line: number } | null;

export interface Scene {
  w: number;
  h: number;
  view: View;
  lines: Line[];
  items: Item[];
  theme: Theme;
  grid: boolean;
  pois: Poi[];
  selected: Poi | null;
  trace: Trace;
}

export function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw) ?? raw;
}

export const toPx = (v: View, w: number, h: number, x: number, y: number) => [w / 2 + (x - v.cx) * v.scale, h / 2 - (y - v.cy) * v.scale] as const;
export const fromPx = (v: View, w: number, h: number, px: number, py: number) => [v.cx + (px - w / 2) / v.scale, v.cy - (py - h / 2) / v.scale] as const;

const branches = (v: Val): number[] => (typeof v === "number" ? [v] : Array.isArray(v) && typeof v[0] === "number" ? (v as number[]) : [NaN]);

export function draw(g: CanvasRenderingContext2D, s: Scene) {
  const { w, h, view, theme } = s;
  const P = (x: number, y: number) => toPx(view, w, h, x, y);
  g.clearRect(0, 0, w, h);
  g.fillStyle = theme.bg;
  g.fillRect(0, 0, w, h);
  const [x0, y1] = fromPx(view, w, h, 0, 0);
  const [x1, y0] = fromPx(view, w, h, w, h);

  // Сетка: мелкая, крупная с подписями, оси.
  const step = niceStep(80 / view.scale);
  g.lineWidth = 1;
  if (s.grid) {
    g.strokeStyle = theme.gridMinor;
    const minor = step / 5;
    g.beginPath();
    for (let x = Math.ceil(x0 / minor) * minor; x <= x1; x += minor) { const [px] = P(x, 0); g.moveTo(Math.round(px) + 0.5, 0); g.lineTo(Math.round(px) + 0.5, h); }
    for (let y = Math.ceil(y0 / minor) * minor; y <= y1; y += minor) { const [, py] = P(0, y); g.moveTo(0, Math.round(py) + 0.5); g.lineTo(w, Math.round(py) + 0.5); }
    g.stroke();
    g.strokeStyle = theme.grid;
    g.beginPath();
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const [px] = P(x, 0); g.moveTo(Math.round(px) + 0.5, 0); g.lineTo(Math.round(px) + 0.5, h); }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const [, py] = P(0, y); g.moveTo(0, Math.round(py) + 0.5); g.lineTo(w, Math.round(py) + 0.5); }
    g.stroke();
  }
  const [ox, oy] = P(0, 0);
  g.strokeStyle = theme.ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, oy); g.lineTo(w, oy); g.moveTo(ox, 0); g.lineTo(ox, h);
  g.stroke();
  g.font = "600 11px Manrope, system-ui, sans-serif";
  g.fillStyle = theme.muted;
  const label = (t: string, px: number, py: number, align: CanvasTextAlign) => {
    g.textAlign = align;
    g.strokeStyle = theme.bg;
    g.lineWidth = 3;
    g.strokeText(t, px, py);
    g.fillText(t, px, py);
  };
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    if (Math.abs(x) < step / 2) continue;
    const [px] = P(x, 0);
    label(fmt(Math.round(x / step) * step), px, Math.min(Math.max(oy + 15, 13), h - 5), "center");
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    if (Math.abs(y) < step / 2) continue;
    const [, py] = P(0, y);
    label(fmt(Math.round(y / step) * step), Math.min(Math.max(ox - 5, 30), w - 4), py + 4, "right");
  }

  // Области и неявные кривые — под графиками.
  s.items.forEach((it, i) => {
    const line = s.lines[i];
    if (it.t !== "implicit" || line.hidden) return;
    implicit(g, s, it.F, it.op, line.color);
  });

  // Явные графики: по пикселю; разрыв на асимптотах и вне области определения.
  s.items.forEach((it, i) => {
    const line = s.lines[i];
    if (it.t !== "curve" || line.hidden) return;
    g.strokeStyle = line.color;
    g.lineWidth = 2.5;
    g.lineJoin = "round";
    const n = it.axis === "y" ? w : h;
    const lim = it.axis === "y" ? h : w;
    // Ветка (для y = [1,2,3]x их несколько) → отрезки без разрывов → точки.
    const segs: [number, number][][][] = [];
    for (let p = 0; p <= n; p += 0.5) {
      const t = it.axis === "y" ? fromPx(view, w, h, p, 0)[0] : fromPx(view, w, h, 0, p)[1];
      branches(it.f(t)).forEach((v, b) => {
        const br = (segs[b] ??= [[]]);
        const cur = br[br.length - 1];
        const q = it.axis === "y" ? P(0, v)[1] : P(v, 0)[0];
        if (!Number.isFinite(q) || Math.abs(q) > lim * 50) {
          if (cur.length) br.push([]);
          return;
        }
        const pt: [number, number] = it.axis === "y" ? [p, q] : [q, p];
        const last = cur[cur.length - 1];
        // скачок больше экрана — асимптота, не соединяем
        if (last && Math.abs((it.axis === "y" ? last[1] : last[0]) - q) > lim * 1.5) br.push([pt]);
        else cur.push(pt);
      });
    }
    g.beginPath();
    for (const br of segs) for (const seg of br ?? []) seg.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
  });

  // Точки и таблицы.
  s.items.forEach((it, i) => {
    const line = s.lines[i];
    if (line.hidden || (it.t !== "points" && it.t !== "table")) return;
    for (const pt of it.pts) {
      const [px, py] = P(pt.x, pt.y);
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;
      g.fillStyle = line.color;
      g.beginPath(); g.arc(px, py, 4.5, 0, Math.PI * 2); g.fill();
      if (it.t === "points" && it.pts.length <= 6) {
        g.fillStyle = theme.ink;
        label(`(${fmt(pt.x)}, ${fmt(pt.y)})`, px + 8, py - 8, "left");
      }
    }
  });

  // Особые точки выбранного графика и выбранная точка.
  for (const p of s.pois) {
    const [px, py] = P(p.x, p.y);
    g.fillStyle = theme.bg;
    g.strokeStyle = theme.muted;
    g.lineWidth = 2;
    g.beginPath(); g.arc(px, py, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  const mark = s.selected ?? s.trace;
  if (mark) {
    const [px, py] = P(mark.x, mark.y);
    g.fillStyle = "color" in mark ? mark.color : theme.ink;
    g.beginPath(); g.arc(px, py, 5.5, 0, Math.PI * 2); g.fill();
    const text = `(${fmt(mark.x)}, ${fmt(mark.y)})`;
    g.font = "700 12px Manrope, system-ui, sans-serif";
    const tw = g.measureText(text).width;
    const bx = Math.min(px + 10, w - tw - 14), by = Math.max(py - 30, 4);
    g.fillStyle = theme.bg;
    g.strokeStyle = theme.grid;
    g.lineWidth = 1;
    g.beginPath(); g.roundRect(bx, by, tw + 12, 22, 6); g.fill(); g.stroke();
    g.fillStyle = theme.ink;
    g.textAlign = "left";
    g.fillText(text, bx + 6, by + 15);
  }
}

/** Неявная кривая F = 0 (marching squares) и область неравенства. */
function implicit(g: CanvasRenderingContext2D, s: Scene, F: (x: number, y: number) => number, op: string, color: string) {
  const { w, h, view } = s;
  const cell = 4;
  const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
  const vals = new Float64Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [x, y] = fromPx(view, w, h, c * cell, r * cell);
      vals[r * cols + c] = F(x, y);
    }
  }
  const V = (c: number, r: number) => vals[r * cols + c];
  if (op !== "=") {
    const inside = (v: number) => (op === "<" || op === "<=" ? v < 0 : v > 0);
    g.fillStyle = color;
    g.globalAlpha = 0.18;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const m = (V(c, r) + V(c + 1, r) + V(c, r + 1) + V(c + 1, r + 1)) / 4;
        if (Number.isFinite(m) && inside(m)) g.fillRect(c * cell, r * cell, cell, cell);
      }
    }
    g.globalAlpha = 1;
  }
  g.strokeStyle = color;
  g.lineWidth = 2.5;
  g.setLineDash(op === "<" || op === ">" ? [8, 6] : []);
  g.beginPath();
  const lerp = (a: number, b: number) => (a / (a - b)) * cell;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = V(c, r), b = V(c + 1, r), d = V(c, r + 1), e = V(c + 1, r + 1);
      if (![a, b, d, e].every(Number.isFinite)) continue;
      const X = c * cell, Y = r * cell;
      const pts: [number, number][] = [];
      if (a * b < 0) pts.push([X + lerp(a, b), Y]);
      if (b * e < 0) pts.push([X + cell, Y + lerp(b, e)]);
      if (d * e < 0) pts.push([X + lerp(d, e), Y + cell]);
      if (a * d < 0) pts.push([X, Y + lerp(a, d)]);
      // Разрыв (например, 1/x): огромные значения разных знаков — не кривая.
      const big = Math.max(Math.abs(a), Math.abs(b), Math.abs(d), Math.abs(e));
      if (big > 1e6 * (1 + Math.min(Math.abs(a), Math.abs(b), Math.abs(d), Math.abs(e)))) continue;
      for (let k = 0; k + 1 < pts.length; k += 2) {
        g.moveTo(pts[k][0], pts[k][1]);
        g.lineTo(pts[k + 1][0], pts[k + 1][1]);
      }
    }
  }
  g.stroke();
  g.setLineDash([]);
}

/** Ближайшая к курсору точка на явных графиках (для трассировки), в пределах tol пикселей. */
export function nearestOnCurves(s: Pick<Scene, "w" | "h" | "view" | "items" | "lines">, px: number, py: number, tol = 14): Trace {
  const [x, y] = fromPx(s.view, s.w, s.h, px, py);
  let best: Trace = null, bestD = tol;
  s.items.forEach((it, i) => {
    const line = s.lines[i];
    if (it.t !== "curve" || line.hidden) return;
    for (const v of branches(it.f(it.axis === "y" ? x : y))) {
      const pt: Pt = it.axis === "y" ? { x, y: v } : { x: v, y };
      const [qx, qy] = toPx(s.view, s.w, s.h, pt.x, pt.y);
      const d = Math.hypot(qx - px, qy - py);
      if (Number.isFinite(d) && d < bestD) { bestD = d; best = { ...pt, color: line.color, line: i }; }
    }
  });
  return best;
}

