"use client";

import { useState } from "react";
import { Close } from "@/components/icons";
import { SystemLogin, type ImportResult } from "@/components/grades/GradesImport";
import { track } from "@/lib/analytics";

export type SchoolSystem = "emaktab" | "emis";

/** Знак eMaktab: «e» в белом квадрате с зелёной точкой (фирменные синий и зелёный). */
function EmaktabMark() {
  return (
    <span className="mark-emaktab relative flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[22px] font-black leading-none" aria-hidden>
      e<i className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" />
    </span>
  );
}
/** Знак EMIS: бордовая надпись в белом круге с золотым кольцом. */
function EmisMark() {
  return (
    <span className="mark-emis flex h-9 w-9 flex-none items-center justify-center rounded-full text-[10px] font-black tracking-tight" style={{ fontFamily: "Georgia, serif" }} aria-hidden>
      EMIS
    </span>
  );
}

/** Две фирменные кнопки «Войти через eMaktab / EMIS». */
export function SchoolButtons({ onPick, compact, only }: { onPick: (s: SchoolSystem) => void; compact?: boolean; only?: SchoolSystem }) {
  const list: SchoolSystem[] = only ? [only] : ["emaktab", "emis"];
  return (
    <div className={`grid gap-2.5 ${!only && !compact ? "sm:grid-cols-2" : ""}`}>
      {list.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} className={`${s === "emaktab" ? "btn-emaktab" : "btn-emis"} flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left shadow-md`}>
          {s === "emaktab" ? <EmaktabMark /> : <EmisMark />}
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold leading-tight">{s === "emaktab" ? "Войти через eMaktab" : "Войти через EMIS"}</span>
            <span className="block text-xs opacity-85">{s === "emaktab" ? "электронный дневник школы" : "система академических лицеев"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Окно входа в eMaktab / EMIS (можно открыть напрямую — например, «Обновить» в дневнике). */
export function SchoolLoginModal({ system, onDone, onClose, children }: { system: SchoolSystem; onDone: (r: ImportResult) => void; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,14,28,.5)] p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal aria-labelledby="schT" className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[24px] bg-surface-solid p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {system === "emaktab" ? <EmaktabMark /> : <EmisMark />}
            <h2 id="schT" className="text-xl font-extrabold">{system === "emaktab" ? "Вход через eMaktab" : "Вход через EMIS"}</h2>
          </div>
          <button className="btn-secondary h-10 w-10 flex-none p-0" aria-label="Закрыть" onClick={onClose}><Close /></button>
        </div>
        {children}
        <div className="mt-4">
          <SystemLogin system={system} onResult={(r) => { onClose(); track("school_connect_done", { system }); onDone(r); }} />
        </div>
        <p className="mt-4 text-xs text-muted">Пароль не сохраняется. Берём оценки, расписание, домашние задания и пропуски, а для анкеты — имя, класс и школу. Учителей, адрес и документы не берём.</p>
      </div>
    </div>
  );
}

/** Кнопки + окно входа. После входа результат уходит в onDone (сохранение решает вызывающий). */
export default function SchoolConnect({ onDone, compact, only, children }: { onDone: (r: ImportResult) => void; compact?: boolean; only?: SchoolSystem; children?: React.ReactNode }) {
  const [open, setOpen] = useState<SchoolSystem | null>(null);
  return (
    <>
      <SchoolButtons compact={compact} only={only} onPick={(s) => { setOpen(s); track("school_connect_open", { system: s }); }} />
      {open && <SchoolLoginModal system={open} onDone={onDone} onClose={() => setOpen(null)}>{children}</SchoolLoginModal>}
    </>
  );
}
