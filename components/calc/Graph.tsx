"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/components/icons";
import { crossings, curvePois, type Poi } from "@/lib/calc/analysis";
import { draw, fromPx, nearestOnCurves, toPx, type Theme, type Trace, type View } from "@/lib/calc/draw";
import type { Item, Line } from "@/lib/calc/model";
import { HOME } from "./useCalcState";

// Холст графика: перетаскивание, масштаб колесом и двумя пальцами, клик по графику выделяет строку
// и показывает её особые точки (корни, экстремумы, пересечения), наведение — трассировка.

const scalar = (it: Item) => (it.t === "curve" && it.axis === "y" ? (x: number) => { const v = it.f(x); return typeof v === "number" ? v : NaN; } : null);

export default function Graph(props: {
  lines: Line[];
  items: Item[];
  view: View;
  setView: (fn: View | ((v: View) => View)) => void;
  grid: boolean;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  selected: Poi | null;
  onSelect: (p: Poi | null) => void;
}) {
  const { lines, items, view, setView, grid, focusId, selected, onSelect, onFocus } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });
  const [trace, setTrace] = useState<Trace>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; start: View; x: number; y: number; dist?: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(200, Math.floor(e.contentRect.width)), h: Math.max(200, Math.floor(e.contentRect.height)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [x0, x1] = [fromPx(view, size.w, size.h, 0, 0)[0], fromPx(view, size.w, size.h, size.w, 0)[0]];
  const pois = useMemo<Poi[]>(() => {
    const i = lines.findIndex((l) => l.id === focusId);
    if (i < 0 || lines[i].hidden) return [];
    const f = scalar(items[i]);
    if (!f) return [];
    const out = curvePois(f, x0, x1);
    items.forEach((it, j) => {
      const g = j !== i && !lines[j].hidden ? scalar(it) : null;
      if (g) out.push(...crossings(f, g, x0, x1));
    });
    return out.slice(0, 40);
  }, [lines, items, focusId, x0, x1]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
    const theme: Theme = { ink: v("--text", "#111834"), muted: v("--muted", "#566079"), grid: v("--line-2", "rgba(0,0,0,.14)"), gridMinor: v("--line-3", "rgba(0,0,0,.05)"), bg: v("--surface-solid", "#fff") };
    draw(g, { w: size.w, h: size.h, view, lines, items, theme, grid, pois, selected, trace });
  }, [size, view, lines, items, grid, pois, selected, trace]);

  // Колесо: масштаб вокруг курсора (нужен passive: false, чтобы не прокручивать страницу).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  });

  function zoomAt(px: number, py: number, k: number) {
    setView((v) => {
      const scale = Math.min(1e6, Math.max(1e-3, v.scale * k));
      const [x, y] = fromPx(v, size.w, size.h, px, py);
      return { scale, cx: x - (px - size.w / 2) / scale, cy: y + (py - size.h / 2) / scale };
    });
  }

  const local = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function onDown(e: React.PointerEvent) {
    canvas.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    gesture.current = { moved: false, start: view, x: pts[0].x, y: pts[0].y, dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined };
  }
  function onMove(e: React.PointerEvent) {
    const p = local(e);
    if (!pointers.current.has(e.pointerId)) {
      if (e.pointerType === "mouse") setTrace(nearestOnCurves({ w: size.w, h: size.h, view, items, lines }, p.x, p.y));
      return;
    }
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist) {
      // щипок: масштаб вокруг середины
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
      const scale = Math.min(1e6, Math.max(1e-3, g.start.scale * (d / g.dist)));
      const [x, y] = fromPx(g.start, size.w, size.h, mx, my);
      setView({ scale, cx: x - (mx - size.w / 2) / scale, cy: y + (my - size.h / 2) / scale });
      g.moved = true;
      return;
    }
    const dx = p.x - g.x, dy = p.y - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    g.moved = true;
    setTrace(null);
    setView({ ...g.start, cx: g.start.cx - dx / g.start.scale, cy: g.start.cy + dy / g.start.scale });
  }
  function onUp(e: React.PointerEvent) {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) return;
    gesture.current = null;
    if (!g || g.moved) return;
    // Клик: особая точка → показать; график → выделить строку; пусто → снять выделение.
    const p = local(e);
    const hit = pois.find((q) => { const [qx, qy] = toPx(view, size.w, size.h, q.x, q.y); return Math.hypot(qx - p.x, qy - p.y) < 12; });
    if (hit) return onSelect(hit);
    const near = nearestOnCurves({ w: size.w, h: size.h, view, items, lines }, p.x, p.y, 18);
    if (near) {
      onFocus(lines[near.line].id);
      setTrace(near);
      onSelect(null);
    } else {
      onSelect(null);
      setTrace(null);
    }
  }

  const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-solid text-lg font-bold shadow-sm";
  return (
    <div ref={wrap} className="relative h-full min-h-[220px] w-full overflow-hidden rounded-xl border border-line">
      <canvas
        ref={canvas}
        style={{ width: size.w, height: size.h, touchAction: "none" }}
        className="block cursor-crosshair"
        role="img"
        aria-label="График выражений"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={(e) => e.pointerType === "mouse" && !pointers.current.size && setTrace(null)}
      />
      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button className={btn} aria-label="Приблизить" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.5)}>+</button>
        <button className={btn} aria-label="Отдалить" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.5)}>−</button>
        <button className={btn} aria-label="Вид по умолчанию" title="Вид по умолчанию" onClick={() => setView(HOME)}><I.Home size={16} /></button>
      </div>
    </div>
  );
}
