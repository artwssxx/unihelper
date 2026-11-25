"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "@/lib/calc/draw";
import type { Line } from "@/lib/calc/model";

// Состояние калькулятора: строки, вид графика, настройки; отмена/повтор; сохраняется на время сессии
// (между вопросами мока и после закрытия панели).

export const COLORS = ["#2F62E8", "#E8652B", "#1F9D55", "#8B5CF6", "#D6336C", "#0EA5E9"];
export const HOME: View = { cx: 0, cy: 0, scale: 40 };
const KEY = "uh-calc";

export type CalcState = { lines: Line[]; view: View; deg: boolean; grid: boolean };

let seq = 0;
export const uid = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;
export const nextColor = (lines: Line[]) => COLORS[lines.length % COLORS.length];

const fresh = (): CalcState => ({ lines: [{ id: uid(), kind: "expr", text: "", color: COLORS[0] }], view: HOME, deg: false, grid: true });

function restore(): CalcState {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as CalcState | null;
    if (s && Array.isArray(s.lines) && s.lines.length && s.view) return s;
  } catch {}
  return fresh();
}

export function useCalcState() {
  const [st, setSt] = useState<CalcState>(fresh);
  const past = useRef<Line[][]>([]);
  const future = useRef<Line[][]>([]);
  const lastPush = useRef(0);

  useEffect(() => setSt(restore()), []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(st));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [st]);

  /** Изменение строк с записью в историю (набор подряд склеивается в один шаг). */
  const setLines = useCallback((fn: (l: Line[]) => Line[]) => {
    setSt((s) => {
      const next = fn(s.lines);
      if (next === s.lines) return s;
      const now = Date.now();
      if (now - lastPush.current > 600) {
        past.current = [...past.current.slice(-49), s.lines];
        future.current = [];
      }
      lastPush.current = now;
      return { ...s, lines: next };
    });
  }, []);

  const undo = useCallback(() => {
    setSt((s) => {
      const prev = past.current.pop();
      if (!prev) return s;
      future.current.push(s.lines);
      lastPush.current = 0;
      return { ...s, lines: prev };
    });
  }, []);
  const redo = useCallback(() => {
    setSt((s) => {
      const nxt = future.current.pop();
      if (!nxt) return s;
      past.current.push(s.lines);
      lastPush.current = 0;
      return { ...s, lines: nxt };
    });
  }, []);

  const setView = useCallback((fn: View | ((v: View) => View)) => setSt((s) => ({ ...s, view: typeof fn === "function" ? fn(s.view) : fn })), []);
  const setOpt = useCallback((patch: Partial<Pick<CalcState, "deg" | "grid">>) => setSt((s) => ({ ...s, ...patch })), []);
  const clear = useCallback(() => {
    past.current.push(st.lines);
    setSt((s) => ({ ...fresh(), deg: s.deg, grid: s.grid }));
  }, [st.lines]);

  return { ...st, setLines, setView, setOpt, undo, redo, clear, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
