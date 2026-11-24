"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/components/icons";
import { evaluate, fmtNum, parseLine, roots } from "@/lib/mocks/calc";

// Графический калькулятор для SAT Math (как встроенный в Bluebook): строки-выражения, график,
// перемещение и масштаб, корни и точки пересечения первых двух графиков.

const COLORS = ["#2F62E8", "#E8652B", "#1F7A3D", "#7B5CF0", "#C2357B"];
type View = { cx: number; cy: number; scale: number }; // scale — пикселей на единицу

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw) ?? raw;
}

export default function Calculator({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<string[]>(["y = 2x + 1", ""]);
  const [view, setView] = useState<View>({ cx: 0, cy: 0, scale: 32 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; v: View } | null>(null);
  const [size, setSize] = useState({ w: 380, h: 300 });

  const parsed = useMemo(() => lines.map(parseLine), [lines]);
  const fns = useMemo(
    () => parsed.map((p, i) => (p.kind === "fn" ? { i, f: (x: number) => evaluate(p.rpn!, x) } : null)).filter(Boolean) as { i: number; f: (x: number) => number }[],
    [parsed],
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(260, Math.floor(e.contentRect.width)), h: Math.max(220, Math.floor(e.contentRect.width * 0.75)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toPx = useCallback((x: number, y: number) => [size.w / 2 + (x - view.cx) * view.scale, size.h / 2 - (y - view.cy) * view.scale] as const, [size, view]);
  const range = useMemo(() => ({ x0: view.cx - size.w / 2 / view.scale, x1: view.cx + size.w / 2 / view.scale }), [size, view]);

  const points = useMemo(() => {
    const out: { label: string; x: number; y: number }[] = [];
    if (fns[0]) for (const r of roots(fns[0].f, range.x0, range.x1)) out.push({ label: "корень", x: r, y: 0 });
    if (fns[0] && fns[1]) {
      const d = (x: number) => fns[0].f(x) - fns[1].f(x);
      for (const r of roots(d, range.x0, range.x1)) out.push({ label: "пересечение", x: r, y: fns[0].f(r) });
    }
    return out.slice(0, 8);
  }, [fns, range]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--text").trim() || "#111834";
    const muted = css.getPropertyValue("--muted").trim() || "#566079";
    const line = css.getPropertyValue("--line").trim() || "rgba(0,0,0,.1)";
    g.clearRect(0, 0, size.w, size.h);
    // сетка и подписи
    const step = niceStep(60 / view.scale);
    g.lineWidth = 1;
    g.font = "11px Manrope, system-ui, sans-serif";
    g.fillStyle = muted;
    g.strokeStyle = line;
    const y0 = view.cy - size.h / 2 / view.scale, y1 = view.cy + size.h / 2 / view.scale;
    for (let x = Math.ceil(range.x0 / step) * step; x <= range.x1; x += step) {
      const [px] = toPx(x, 0);
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, size.h); g.stroke();
      if (Math.abs(x) > step / 2) g.fillText(fmtNum(Math.round(x / step) * step), px + 3, Math.min(Math.max(toPx(0, 0)[1] + 13, 13), size.h - 4));
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      const [, py] = toPx(0, y);
      g.beginPath(); g.moveTo(0, py); g.lineTo(size.w, py); g.stroke();
      if (Math.abs(y) > step / 2) g.fillText(fmtNum(Math.round(y / step) * step), Math.min(Math.max(toPx(0, 0)[0] + 4, 4), size.w - 30), py - 3);
    }
    // оси
    g.strokeStyle = ink;
    g.lineWidth = 1.4;
    const [ox, oy] = toPx(0, 0);
    g.beginPath(); g.moveTo(0, oy); g.lineTo(size.w, oy); g.moveTo(ox, 0); g.lineTo(ox, size.h); g.stroke();
    // графики
    for (const { i, f } of fns) {
      g.strokeStyle = COLORS[i % COLORS.length];
      g.lineWidth = 2.4;
      g.beginPath();
      let pen = false, prevY = 0;
      for (let px = 0; px <= size.w; px += 1) {
        const x = view.cx + (px - size.w / 2) / view.scale;
        const y = f(x);
        const py = size.h / 2 - (y - view.cy) * view.scale;
        if (!Number.isFinite(py) || Math.abs(py) > 1e5 || (pen && Math.abs(py - prevY) > size.h * 2)) { pen = false; continue; }
        if (pen) g.lineTo(px, py); else g.moveTo(px, py);
        pen = true;
        prevY = py;
      }
      g.stroke();
    }
    // точки
    for (const p of points) {
      const [px, py] = toPx(p.x, p.y);
      g.fillStyle = ink;
      g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
    }
  }, [fns, points, range, size, toPx, view]);

  const zoom = (k: number) => setView((v) => ({ ...v, scale: Math.min(4000, Math.max(0.5, v.scale * k)) }));

  return (
    <aside
      aria-label="Калькулятор"
      className="fixed inset-x-2 bottom-2 z-40 flex max-h-[85vh] flex-col overflow-hidden rounded-[22px] border border-line bg-surface-solid shadow-2xl sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-[420px]"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <b>Калькулятор</b>
        <div className="flex items-center gap-1">
          <button className="rounded-lg px-2 py-1 text-lg font-bold" aria-label="Приблизить" onClick={() => zoom(1.5)}>+</button>
          <button className="rounded-lg px-2 py-1 text-lg font-bold" aria-label="Отдалить" onClick={() => zoom(1 / 1.5)}>−</button>
          <button className="rounded-lg px-2 py-1 text-xs font-bold text-primary" onClick={() => setView({ cx: 0, cy: 0, scale: 32 })}>Сброс</button>
          <button className="rounded-lg p-1.5" aria-label="Закрыть калькулятор" onClick={onClose}><I.Close size={18} /></button>
        </div>
      </header>
      <div className="overflow-y-auto">
        <div className="space-y-1.5 p-3">
          {lines.map((l, i) => {
            const p = parsed[i];
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: p.kind === "fn" ? COLORS[i % COLORS.length] : "transparent", border: p.kind === "fn" ? "none" : "1px solid var(--line)" }} />
                <input
                  className="input min-w-0 flex-1 py-2 font-mono text-sm"
                  value={l}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={`Выражение ${i + 1}`}
                  placeholder={i === 0 ? "y = x^2 - 4" : "ещё выражение или число"}
                  onChange={(e) => {
                    const next = lines.map((x, j) => (j === i ? e.target.value.slice(0, 120) : x));
                    if (i === lines.length - 1 && e.target.value && lines.length < 5) next.push("");
                    setLines(next);
                  }}
                />
                <span className={`w-24 flex-none truncate text-right text-xs ${p.kind === "error" ? "text-red" : "text-muted"}`} title={p.error}>
                  {p.kind === "value" ? `= ${fmtNum(p.value!)}` : p.kind === "error" ? p.error : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div ref={wrap} className="px-3">
          <canvas
            ref={canvas}
            style={{ width: size.w, height: size.h, touchAction: "none" }}
            className="cursor-grab rounded-xl border border-line"
            onPointerDown={(e) => {
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, v: view };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              setView({ ...d.v, cx: d.v.cx - (e.clientX - d.x) / d.v.scale, cy: d.v.cy + (e.clientY - d.y) / d.v.scale });
            }}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
            role="img"
            aria-label="График выражений"
          />
        </div>
        <div className="space-y-1 p-3 text-xs text-body">
          {points.length > 0 ? (
            points.map((p, i) => <div key={i}>{p.label}: ({fmtNum(p.x)}; {fmtNum(p.y)})</div>)
          ) : (
            <div className="text-muted">Корни первого графика и пересечение первых двух появятся здесь. Поддерживаются x², sqrt, abs, sin, cos, π, неявное умножение (2x).</div>
          )}
        </div>
      </div>
    </aside>
  );
}
