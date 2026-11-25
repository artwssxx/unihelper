"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/components/icons";
import type { Poi } from "@/lib/calc/analysis";
import { buildModel, fmt } from "@/lib/calc/model";
import DesmosEmbed, { DESMOS_KEY } from "./DesmosEmbed";
import ExprList from "./ExprList";
import Graph from "./Graph";
import Keypad, { type KeyAction } from "./Keypad";
import { nextColor, uid, useCalcState } from "./useCalcState";

// Графический калькулятор уровня Desmos (как встроенный в Bluebook): переменные с ползунками, функции,
// неявные кривые и неравенства, точки и списки, таблицы с регрессией, особые точки, градусы/радианы.
// mode="panel" — плавающая панель в моке; mode="page" — отдельная страница.

const POI_NAME: Record<Poi["kind"], string> = { root: "корень", yint: "пересечение с осью y", min: "минимум", max: "максимум", cross: "пересечение" };

export default function Calculator({ mode = "panel", onClose }: { mode?: "panel" | "page"; onClose?: () => void }) {
  const st = useCalcState();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [keypad, setKeypad] = useState(false);
  const [wide, setWide] = useState(false);
  const [engine, setEngine] = useState<"uh" | "desmos">("uh");
  const active = useRef<HTMLInputElement | null>(null);
  const model = useMemo(() => buildModel(st.lines, st.deg), [st.lines, st.deg]);

  // На телефоне клавиатура нужна сразу
  useEffect(() => setKeypad(matchMedia("(pointer: coarse)").matches), []);

  // Ctrl+Z / Ctrl+Shift+Z — отмена и повтор
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) st.redo();
      else st.undo();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [st]);

  function key(a: KeyAction) {
    const el = active.current;
    const id = focusId;
    if (!el || !id) return;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    let text = el.value, pos = s;
    if ("insert" in a) {
      text = text.slice(0, s) + a.insert + text.slice(e);
      pos = s + a.insert.length + (a.caret ?? 0);
    } else if (a.cmd === "back") {
      if (s !== e) { text = text.slice(0, s) + text.slice(e); pos = s; }
      else if (s > 0) { text = text.slice(0, s - 1) + text.slice(s); pos = s - 1; }
    } else if (a.cmd === "left") pos = Math.max(0, s - 1);
    else if (a.cmd === "right") pos = Math.min(text.length, s + 1);
    else if (a.cmd === "enter") {
      const nid = uid();
      st.setLines((ls) => { const i = ls.findIndex((l) => l.id === id); return [...ls.slice(0, i + 1), { id: nid, kind: "expr", text: "", color: nextColor(ls) }, ...ls.slice(i + 1)]; });
      requestAnimationFrame(() => {
        const inputs = [...document.querySelectorAll<HTMLInputElement>("[aria-label^='Выражение']")];
        const idx = inputs.indexOf(el);
        inputs[idx + 1]?.focus();
      });
      return;
    }
    if (text !== el.value) st.setLines((ls) => ls.map((l) => (l.id === id && l.kind === "expr" ? { ...l, text } : l)));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos); });
  }

  const addTable = () => st.setLines((ls) => [...ls.filter((l) => l.kind !== "expr" || l.text.trim()), { id: uid(), kind: "table", xs: ["", "", ""], ys: ["", "", ""], color: nextColor(ls) }, { id: uid(), kind: "expr", text: "", color: nextColor([...ls, ls[0]]) }]);

  const focusIdx = st.lines.findIndex((l) => l.id === focusId);
  const tool = "flex h-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-body hover:bg-line-3 disabled:opacity-35";
  const header = (
    <header className="flex flex-wrap items-center justify-between gap-1 border-b border-line px-3 py-2">
      <b className="mr-1">Калькулятор</b>
      <div className="flex flex-wrap items-center gap-0.5">
        {engine === "uh" && (
          <>
            <button className={tool} onClick={st.undo} disabled={!st.canUndo} aria-label="Отменить" title="Отменить (Ctrl+Z)">↶</button>
            <button className={tool} onClick={st.redo} disabled={!st.canRedo} aria-label="Повторить" title="Повторить (Ctrl+Shift+Z)">↷</button>
            <button className={tool} onClick={addTable} title="Добавить таблицу">Таблица</button>
            <button className={tool} onClick={() => st.setOpt({ deg: !st.deg })} title="Градусы или радианы для sin, cos, tan" aria-pressed={st.deg}>{st.deg ? "DEG" : "RAD"}</button>
            <button className={tool} onClick={() => st.setOpt({ grid: !st.grid })} aria-pressed={st.grid} title="Сетка">#</button>
            <button className={tool} onClick={() => setKeypad(!keypad)} aria-pressed={keypad} title="Клавиатура">⌨</button>
            <button className={tool} onClick={st.clear} title="Очистить всё">Очистить</button>
          </>
        )}
        {DESMOS_KEY && (
          <button className={tool} onClick={() => setEngine(engine === "uh" ? "desmos" : "uh")} title="Переключить на официальный Desmos">{engine === "uh" ? "Desmos" : "UniHelper"}</button>
        )}
        {mode === "panel" && (
          <button className={`${tool} hidden sm:flex`} onClick={() => setWide(!wide)} aria-pressed={wide} title={wide ? "Свернуть" : "Развернуть"}>{wide ? "⤡" : "⤢"}</button>
        )}
        {onClose && <button className={tool} aria-label="Закрыть калькулятор" onClick={onClose}><I.Close size={18} /></button>}
      </div>
    </header>
  );

  const pois = focusIdx >= 0 ? model.items[focusIdx] : null;
  const body =
    engine === "desmos" ? (
      <div className="min-h-0 flex-1"><DesmosEmbed /></div>
    ) : (
      <div className={`flex min-h-0 flex-1 flex-col ${wide || mode === "page" ? "md:flex-row" : ""}`}>
        <div className={`flex min-h-0 flex-col ${wide || mode === "page" ? "md:w-[380px] md:flex-none md:border-r md:border-line" : ""}`}>
          <div className={`overflow-y-auto ${mode === "page" ? "max-h-[45vh] md:max-h-none md:flex-1" : wide ? "max-h-[32vh] md:max-h-none md:flex-1" : "max-h-[32vh]"}`}>
            <ExprList lines={st.lines} items={model.items} setLines={st.setLines} focusId={focusId} onFocus={(id, el) => { setFocusId(id); active.current = el; setSelected(null); }} />
          </div>
          {keypad && <Keypad onKey={key} />}
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <div className={mode === "page" ? "h-[55vh] md:h-auto md:flex-1" : wide ? "h-[42vh] md:h-auto md:flex-1" : "h-[300px]"}>
            <Graph
              lines={st.lines}
              items={model.items}
              view={st.view}
              setView={st.setView}
              grid={st.grid}
              focusId={focusId}
              onFocus={(id) => { setFocusId(id); setSelected(null); }}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <Hint focused={pois?.t === "curve"} selected={selected} />
        </div>
      </div>
    );

  if (mode === "page") {
    return <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[22px] border border-line bg-surface-solid">{header}{body}</div>;
  }
  return (
    <aside
      aria-label="Калькулятор"
      className={`fixed z-40 flex flex-col overflow-hidden border border-line bg-surface-solid shadow-2xl inset-x-0 bottom-0 max-h-[88vh] rounded-t-[22px] ${
        wide ? "sm:inset-4 sm:max-h-none sm:rounded-[22px]" : "sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:w-[440px] sm:rounded-[22px]"
      }`}
    >
      {header}
      {body}
    </aside>
  );
}

function Hint({ focused, selected }: { focused: boolean; selected: Poi | null }) {
  return (
    <p className="px-1 pt-2 text-xs text-muted" aria-live="polite">
      {selected ? (
        <span className="font-bold text-ink" translate="no">{POI_NAME[selected.kind]}: ({fmt(selected.x)}, {fmt(selected.y)})</span>
      ) : focused ? (
        "Серые точки — корни, экстремумы и пересечения: нажми на точку, чтобы увидеть координаты."
      ) : (
        "Нажми на график, чтобы увидеть корни, вершину и пересечения. Перетаскивай и масштабируй колесом или двумя пальцами."
      )}
    </p>
  );
}
