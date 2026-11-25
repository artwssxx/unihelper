"use client";

import { useEffect, useRef, useState } from "react";
import * as I from "@/components/icons";
import { regression, type Fit, type RegKind } from "@/lib/calc/analysis";
import { fmt, fmtVal, type Item, type Line, type Slider, type TableLine } from "@/lib/calc/model";
import { nextColor, uid } from "./useCalcState";

// Список выражений: строка ввода с цветом (клик — скрыть/показать), значение или ошибка справа,
// «добавить ползунок» для неизвестной переменной, ползунок с анимацией, таблица с регрессией.

type Props = {
  lines: Line[];
  items: Item[];
  setLines: (fn: (l: Line[]) => Line[]) => void;
  focusId: string | null;
  onFocus: (id: string, el: HTMLInputElement) => void;
};

const DEF_SLIDER: Slider = { min: -10, max: 10, step: 0.1 };

export default function ExprList({ lines, items, setLines, focusId, onFocus }: Props) {
  const patch = (id: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...p } as Line) : l)));
  const remove = (id: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : [{ ...ls[0], kind: "expr", text: "" } as Line]));
  const addAfter = (id: string, line: Line) => setLines((ls) => { const i = ls.findIndex((l) => l.id === id); return [...ls.slice(0, i + 1), line, ...ls.slice(i + 1)]; });

  return (
    <ol className="divide-y divide-line-3">
      {lines.map((l, i) => {
        const it = items[i];
        return (
          <li key={l.id} className={`py-2 ${focusId === l.id ? "bg-primary-soft/40" : ""}`}>
            <div className="flex items-start gap-2 px-2">
              <span className="mt-2.5 w-5 flex-none text-right text-[11px] font-bold text-muted">{i + 1}</span>
              <button
                aria-label={l.hidden ? "Показать на графике" : "Скрыть с графика"}
                title={l.hidden ? "Показать на графике" : "Скрыть с графика"}
                onClick={() => patch(l.id, { hidden: !l.hidden })}
                className="mt-2 h-5 w-5 flex-none rounded-full border-2"
                style={{ borderColor: l.color, background: l.hidden ? "transparent" : l.color, opacity: drawable(it) ? 1 : 0.25 }}
              />
              {l.kind === "expr" ? (
                <input
                  className="input min-w-0 flex-1 py-2 font-mono text-[15px]"
                  value={l.text}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  translate="no"
                  aria-label={`Выражение ${i + 1}`}
                  placeholder={i === 0 ? "y = x^2 - 4, f(x) = …, a = 2" : "ещё выражение"}
                  onFocus={(e) => onFocus(l.id, e.currentTarget)}
                  onChange={(e) => {
                    const text = e.target.value.slice(0, 200);
                    setLines((ls) => {
                      const next = ls.map((x) => (x.id === l.id ? { ...x, text } : x)) as Line[];
                      // пустая строка в конце всегда есть
                      return next[next.length - 1].kind === "expr" && (next[next.length - 1] as { text: string }).text ? [...next, { id: uid(), kind: "expr", text: "", color: nextColor(next) }] : next;
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAfter(l.id, { id: uid(), kind: "expr", text: "", color: nextColor(lines) });
                      requestAnimationFrame(() => (document.querySelectorAll<HTMLInputElement>("[aria-label^='Выражение']")[i + 1])?.focus());
                    }
                  }}
                />
              ) : (
                <TableEditor line={l} onChange={(p) => patch(l.id, p)} onFit={(f) => addAfter(l.id, { id: uid(), kind: "expr", text: f.formula, color: l.color })} />
              )}
              <button className="mt-1.5 flex-none rounded-lg p-1.5 text-muted hover:text-red" aria-label={`Удалить строку ${i + 1}`} onClick={() => remove(l.id)}>
                <I.Close size={16} />
              </button>
            </div>
            <Under line={l} item={it} patch={patch} onAddSlider={(name) => addAfter(l.id, { id: uid(), kind: "expr", text: `${name} = 1`, color: nextColor(lines) })} />
          </li>
        );
      })}
    </ol>
  );
}

const drawable = (it: Item) => ["curve", "implicit", "points", "table"].includes(it.t);

/** Что под строкой: значение, ошибка, ползунок. */
function Under({ line, item, patch, onAddSlider }: { line: Line; item: Item; patch: (id: string, p: Partial<Line>) => void; onAddSlider: (name: string) => void }) {
  if (line.kind !== "expr") return null;
  if (item.t === "error") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 pl-[60px] pr-10 text-xs">
        <span className="font-semibold text-red">{item.msg}</span>
        {item.missing && item.missing !== "x" && item.missing !== "y" && (
          <button className="rounded-full bg-primary-soft px-2.5 py-1 font-bold text-primary-ink" onClick={() => onAddSlider(item.missing!)}>
            + ползунок {item.missing}
          </button>
        )}
      </div>
    );
  }
  if (item.t === "value" || item.t === "points") return <div className="mt-1 pl-[60px] pr-10 text-right font-mono text-sm font-bold" translate="no">= {fmtVal(item.value)}</div>;
  if (item.t === "bool") return <div className="mt-1 pl-[60px] pr-10 text-right text-sm font-bold">{item.ok ? "верно" : "неверно"}</div>;
  if (item.t === "var" && !item.slider) return <div className="mt-1 pl-[60px] pr-10 text-right font-mono text-sm font-bold" translate="no">= {fmtVal(item.value)}</div>;
  if (item.t === "var" && item.slider && typeof item.value === "number") return <SliderRow line={line} name={item.name} value={item.value} patch={patch} />;
  return null;
}

function SliderRow({ line, name, value, patch }: { line: Extract<Line, { kind: "expr" }>; name: string; value: number; patch: (id: string, p: Partial<Line>) => void }) {
  const s = line.slider ?? DEF_SLIDER;
  const min = Math.min(s.min, value), max = Math.max(s.max, value);
  const [play, setPlay] = useState(false);
  const dir = useRef(1);
  const cur = useRef(value);
  cur.current = value;
  const set = (v: number) => patch(line.id, { text: `${name} = ${fmt(Math.round(v / s.step) * s.step)}` });

  // Анимация: туда-обратно по диапазону примерно за 4 секунды.
  useEffect(() => {
    if (!play) return;
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      let v = cur.current + dir.current * ((max - min) / 4) * dt;
      if (v > max) { v = max; dir.current = -1; }
      if (v < min) { v = min; dir.current = 1; }
      cur.current = v;
      set(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, min, max, s.step]);

  const num = (k: keyof Slider, label: string) => (
    <input
      className="w-14 rounded-md border border-line bg-surface px-1.5 py-0.5 text-center font-mono text-xs"
      aria-label={label}
      defaultValue={fmt(s[k])}
      onBlur={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v) && (k !== "step" || v > 0)) patch(line.id, { slider: { ...s, [k]: v } });
      }}
    />
  );
  return (
    <div className="mt-1.5 flex items-center gap-2 pl-[60px] pr-2">
      <button className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-line" aria-label={play ? "Остановить" : "Запустить анимацию"} onClick={() => setPlay(!play)}>
        {play ? <span className="block h-2.5 w-2.5 rounded-sm bg-current" /> : <I.Play size={14} />}
      </button>
      {num("min", "Минимум ползунка")}
      <input type="range" className="min-w-0 flex-1 accent-primary" min={min} max={max} step={s.step} value={value} aria-label={`Ползунок ${name}`} onChange={(e) => set(Number(e.target.value))} />
      {num("max", "Максимум ползунка")}
      {num("step", "Шаг ползунка")}
    </div>
  );
}

function TableEditor({ line, onChange, onFit }: { line: TableLine; onChange: (p: Partial<TableLine>) => void; onFit: (f: Fit) => void }) {
  const rows = Math.max(line.xs.length, line.ys.length, 3) + 1;
  const [fit, setFit] = useState<Fit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const setCell = (col: "xs" | "ys", i: number, v: string) => {
    const arr = [...line[col]];
    while (arr.length <= i) arr.push("");
    arr[i] = v;
    onChange({ [col]: arr });
  };
  const pts = () =>
    Array.from({ length: rows }, (_, i) => ({ x: Number(line.xs[i]), y: Number(line.ys[i]) })).filter((p, i) => line.xs[i]?.trim() && line.ys[i]?.trim() && Number.isFinite(p.x) && Number.isFinite(p.y));
  const run = (k: RegKind) => {
    const f = regression(pts(), k);
    if (!f) return setErr(k === "exponential" ? "Нужны хотя бы 2 точки с y > 0" : `Нужно больше точек (минимум ${k === "quadratic" ? 3 : 2})`);
    setErr(null);
    setFit(f);
    onFit(f);
  };
  return (
    <div className="min-w-0 flex-1">
      <table className="w-full border-collapse font-mono text-sm" translate="no">
        <thead>
          <tr className="text-xs text-muted"><th className="border border-line px-2 py-1">x₁</th><th className="border border-line px-2 py-1">y₁</th></tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {(["xs", "ys"] as const).map((col) => (
                <td key={col} className="border border-line p-0">
                  <input className="w-full bg-transparent px-2 py-1 text-center outline-none focus:bg-primary-soft/40" aria-label={`${col === "xs" ? "x" : "y"} строка ${i + 1}`} value={line[col][i] ?? ""} onChange={(e) => setCell(col, i, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-muted">Регрессия:</span>
        {([["linear", "линейная"], ["quadratic", "квадратичная"], ["exponential", "экспонента"]] as const).map(([k, label]) => (
          <button key={k} className="rounded-full border border-line px-2.5 py-1 font-bold hover:border-primary" onClick={() => run(k)}>{label}</button>
        ))}
      </div>
      {err && <p className="mt-1 text-xs font-semibold text-red">{err}</p>}
      {fit && <p className="mt-1 font-mono text-xs" translate="no">{fit.formula} · r² = {fmt(fit.r2)}</p>}
    </div>
  );
}
