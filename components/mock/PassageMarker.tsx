"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/components/icons";

// Выделение, подчёркивание и заметки в тексте IELTS Reading — как на компьютерном экзамене.
// Хранится только в этом браузере (на сервер не уходит) и живёт, пока идёт попытка.

export type Mark = { id: string; start: number; end: number; kind: "hl" | "ul"; note?: string };
type Pop = { x: number; y: number; range?: { start: number; end: number }; markId?: string; editing?: boolean };

const keyOf = (attemptId: string, passageId: string) => `uh-marks:${attemptId}:${passageId}`;

function loadMarks(key: string): Mark[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

/** Делим текст на куски по границам разметки: у каждого куска свой сдвиг от начала текста. */
export function segments(text: string, marks: Mark[]): { start: number; end: number; mark?: Mark }[] {
  const cuts = new Set([0, text.length]);
  for (const m of marks) {
    cuts.add(Math.max(0, Math.min(text.length, m.start)));
    cuts.add(Math.max(0, Math.min(text.length, m.end)));
  }
  const pts = [...cuts].sort((a, b) => a - b);
  const out: { start: number; end: number; mark?: Mark }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [s, e] = [pts[i], pts[i + 1]];
    if (s === e) continue;
    out.push({ start: s, end: e, mark: marks.find((m) => m.start <= s && m.end >= e) });
  }
  return out;
}

/** Новая разметка заменяет пересекающиеся с ней куски старой. */
export function addMark(marks: Mark[], m: Mark): Mark[] {
  const out: Mark[] = [];
  for (const x of marks) {
    if (x.end <= m.start || x.start >= m.end) out.push(x);
    else {
      if (x.start < m.start) out.push({ ...x, id: `${x.id}a`, end: m.start, note: x.note });
      if (x.end > m.end) out.push({ ...x, id: `${x.id}b`, start: m.end, note: undefined });
    }
  }
  return [...out, m].sort((a, b) => a.start - b.start);
}

export default function PassageMarker({ attemptId, passageId, text }: { attemptId: string; passageId: string; text: string }) {
  const key = keyOf(attemptId, passageId);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setMarks(loadMarks(key)), [key]);
  const save = useCallback(
    (next: Mark[]) => {
      setMarks(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key],
  );

  const offsetOf = (node: Node, off: number): number | null => {
    const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element))?.closest<HTMLElement>("[data-off]");
    if (!el || !box.current?.contains(el)) return null;
    return Number(el.dataset.off) + (node.nodeType === Node.TEXT_NODE ? off : 0);
  };

  function openFromSelection(e: { clientX: number; clientY: number }) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    const r = sel.getRangeAt(0);
    const a = offsetOf(r.startContainer, r.startOffset);
    const b = offsetOf(r.endContainer, r.endOffset);
    if (a == null || b == null || a === b) return false;
    const rect = r.getBoundingClientRect();
    setPop({ x: rect.left + rect.width / 2 || e.clientX, y: (rect.top || e.clientY) - 8, range: { start: Math.min(a, b), end: Math.max(a, b) } });
    return true;
  }

  function apply(kind: Mark["kind"], withNote = false) {
    if (!pop?.range) return;
    const m: Mark = { id: Math.random().toString(36).slice(2, 9), start: pop.range.start, end: pop.range.end, kind };
    save(addMark(marks, m));
    window.getSelection()?.removeAllRanges();
    if (withNote) {
      setDraft("");
      setPop({ x: pop.x, y: pop.y, markId: m.id, editing: true });
    } else setPop(null);
  }

  const current = pop?.markId ? marks.find((m) => m.id === pop.markId) : undefined;
  const notes = useMemo(() => marks.filter((m) => m.note), [marks]);

  useEffect(() => {
    if (!pop) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-marker-pop]")) setPop(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPop(null);
    const t = setTimeout(() => document.addEventListener("mousedown", close), 0);
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [pop]);

  return (
    <>
      <div
        ref={box}
        className="mt-4 whitespace-pre-line text-[16px] leading-[1.75] text-ink"
        onMouseUp={(e) => openFromSelection(e)}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          setTimeout(() => openFromSelection({ clientX: t.clientX, clientY: t.clientY }), 50);
        }}
        onContextMenu={(e) => {
          if (openFromSelection(e)) e.preventDefault();
        }}
      >
        {segments(text, marks).map((s) =>
          s.mark ? (
            <mark
              key={`${s.start}-${s.mark.id}`}
              data-off={s.start}
              className={`cursor-pointer rounded-sm text-inherit ${s.mark.kind === "hl" ? "bg-orange-soft" : "bg-transparent underline decoration-primary decoration-2 underline-offset-4"}`}
              onClick={(e) => {
                if (!window.getSelection()?.isCollapsed) return;
                setDraft(s.mark!.note ?? "");
                setPop({ x: e.clientX, y: e.clientY - 8, markId: s.mark!.id });
              }}
            >
              {text.slice(s.start, s.end)}
              {s.mark.note && s.end === s.mark.end && <sup className="ml-0.5 inline-block text-primary" aria-label="есть заметка"><I.Pen size={11} /></sup>}
            </mark>
          ) : (
            <span key={s.start} data-off={s.start}>{text.slice(s.start, s.end)}</span>
          ),
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-6 space-y-2 border-t border-line pt-4">
          <div className="text-xs font-extrabold tracking-[0.14em] text-muted">ЗАМЕТКИ</div>
          {notes.map((m) => (
            <div key={m.id} className="rounded-xl bg-line-3 px-3 py-2 text-sm">
              <div className="truncate text-xs text-muted">«{text.slice(m.start, m.end)}»</div>
              <div className="whitespace-pre-line">{m.note}</div>
            </div>
          ))}
        </div>
      )}

      {pop && (
        <div
          data-marker-pop
          role="dialog"
          aria-label="Разметка текста"
          className="fixed z-[60] w-max max-w-[300px] -translate-x-1/2 -translate-y-full rounded-2xl border border-line bg-surface-solid p-2 shadow-2xl"
          style={{ left: Math.min(Math.max(pop.x, 160), window.innerWidth - 160), top: Math.max(pop.y, 70) }}
        >
          {pop.range && (
            <div className="flex gap-1">
              <button className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-orange-soft" onClick={() => apply("hl")}>Выделить</button>
              <button className="rounded-xl px-3 py-2 text-sm font-bold underline decoration-primary decoration-2 underline-offset-4 hover:bg-primary-soft" onClick={() => apply("ul")}>Подчеркнуть</button>
              <button className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-primary-soft" onClick={() => apply("hl", true)}>Заметка</button>
            </div>
          )}
          {current && !pop.editing && (
            <div className="flex gap-1">
              <button className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-primary-soft" onClick={() => setPop({ ...pop, editing: true })}>{current.note ? "Изменить заметку" : "Заметка"}</button>
              <button className="rounded-xl px-3 py-2 text-sm font-bold text-red hover:bg-red-soft" onClick={() => { save(marks.filter((m) => m.id !== current.id)); setPop(null); }}>Снять</button>
            </div>
          )}
          {current && pop.editing && (
            <div className="w-[260px] space-y-2 p-1">
              <textarea className="input min-h-20 text-sm" autoFocus maxLength={300} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Заметка к выделенному" aria-label="Текст заметки" />
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 px-3 py-2 text-sm" onClick={() => setPop(null)}>Отмена</button>
                <button className="btn-primary flex-1 px-3 py-2 text-sm" onClick={() => { save(marks.map((m) => (m.id === current.id ? { ...m, note: draft.trim() || undefined } : m))); setPop(null); }}>Сохранить</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Удалить разметку попытки (после завершения). */
export function clearMarks(attemptId: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`uh-marks:${attemptId}:`)) localStorage.removeItem(k);
  } catch {}
}
