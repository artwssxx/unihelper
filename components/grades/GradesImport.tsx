"use client";

import { useState } from "react";
import { Close } from "@/components/icons";
import { apiFetch } from "@/lib/auth";
import type { Diary, DiaryPerson } from "@/lib/diary";
import { parseGradesText, type GradeItem, type GradeScale, type GradeSource } from "@/lib/grades";
import { readFile } from "@/lib/readFile";

export type ImportResult = { items: GradeItem[]; scale: GradeScale; source: GradeSource; period?: string; grade?: number | null; note?: string; diary?: Diary; person?: DiaryPerson };
type Mode = "emaktab" | "emis" | "file" | "text";

const TABS: [Mode, string][] = [["emaktab", "eMaktab"], ["emis", "EMIS (лицеи)"], ["file", "Фото или PDF"], ["text", "Вставить таблицу"]];

/** Импорт оценок: вход в eMaktab (школы) или EMIS (лицеи), фото/PDF табеля или вставленный текст. */
export default function GradesImport({ initial = "emaktab", onResult, onClose }: { initial?: Mode; onResult: (r: ImportResult) => void; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,14,28,.5)] p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal aria-labelledby="grImpT" className="max-h-[92vh] w-full max-w-[600px] overflow-y-auto rounded-[24px] bg-surface-solid p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="grImpT" className="text-xl font-extrabold">Загрузить оценки</h2>
            <p className="mt-1 text-sm text-body">Предметы и средние баллы подтянутся в профиль, а GPA посчитается сам.</p>
          </div>
          <button className="btn-secondary h-10 w-10 flex-none p-0" aria-label="Закрыть" onClick={onClose}><Close /></button>
        </div>
        <div className="tabs-row mt-4" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={mode === k} className="chip px-3.5 py-2 text-sm" data-on={mode === k} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>
        <div className="mt-4">
          {mode === "emaktab" && <SystemLogin system="emaktab" onResult={onResult} />}
          {mode === "emis" && (
            <div className="space-y-4">
              <SystemLogin system="emis" onResult={onResult} />
              <details className="rounded-2xl border border-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">Нет пароля от EMIS? Загрузи скриншот или таблицу</summary>
                <div className="mt-3 space-y-4">
                  <p className="text-sm text-body">Открой в EMIS раздел с оценками и сделай скриншот или скопируй таблицу.</p>
                  <FileImport source="emis" onResult={onResult} />
                  <TextImport source="emis" onResult={onResult} />
                </div>
              </details>
            </div>
          )}
          {mode === "file" && (
            <div className="space-y-3">
              <p className="text-sm text-body">Фото табеля, скриншот дневника или PDF-выписка. Снимай ровно и целиком, чтобы были видны предметы и оценки.</p>
              <FileImport source="photo" onResult={onResult} />
            </div>
          )}
          {mode === "text" && <TextImport source="text" onResult={onResult} big />}
        </div>
        <p className="mt-5 text-xs text-muted">Файлы и пароли не сохраняются. Берём только названия предметов и оценки — без имени и других личных данных.</p>
      </div>
    </div>
  );
}

const SYS = {
  emaktab: { name: "eMaktab", login: "Логин eMaktab", placeholder: "логин ученика", note: "Войди аккаунтом ученика, не родителя. Пароль нужен один раз — чтобы зайти в eMaktab и забрать отметки за учебный год. Мы его не сохраняем." },
  emis: { name: "EMIS", login: "Логин EMIS", placeholder: "логин лицеиста (как в кабинете студента)", note: "Логин и пароль — те же, что в кабинете студента EMIS (emis.edu.uz). Пароль нужен один раз — чтобы забрать оценки за семестры, углублённые предметы отметятся сами. Мы его не сохраняем." },
} as const;

/** Вход в eMaktab или EMIS по логину ученика: пароль уходит на сервер один раз и не сохраняется. */
export function SystemLogin({ system, onResult }: { system: "emaktab" | "emis"; onResult: (r: ImportResult) => void }) {
  const t = SYS[system];
  // Логин (не пароль) запоминаем на этом устройстве — при обновлении дневника останется ввести только пароль.
  const [login, setLogin] = useState(() => { try { return localStorage.getItem(`uh-login-${system}`) ?? ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<{ image: string | null; state: string; message: string } | null>(null);
  const [answer, setAnswer] = useState("");

  async function go() {
    setBusy(true);
    setErr(null);
    const r = await apiFetch("/api/grades/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: system, login, password, ...(captcha && answer ? { captcha: { answer, state: captcha.state } } : {}) }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!j) return setErr("Нет связи с сервером. Проверь интернет и попробуй ещё раз.");
    if (j.status === "ok") {
      setPassword("");
      try { localStorage.setItem(`uh-login-${system}`, login.trim()); } catch { /* без запоминания */ }
      return onResult({ items: j.items, scale: j.scale, source: system, period: j.period, grade: j.grade, diary: j.diary, person: j.person, note: system === "emaktab" ? `Из eMaktab: ${j.marks} отметок за ${j.period}.` : `Из EMIS: ${j.items.length} предметов (${j.period}).` });
    }
    if (j.status === "captcha") {
      setCaptcha({ image: j.image, state: j.state, message: j.message });
      setAnswer("");
      return;
    }
    setCaptcha(null);
    setErr(`${j.message ?? "Не получилось загрузить оценки."}${j.diag ? ` [${j.diag}]` : ""}`);
  }

  const ready = login.trim().length >= 2 && password.length > 0 && (!captcha || answer.trim().length > 0);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) go(); }}>
      <label className="block text-sm font-semibold">{t.login}
        <input className="input mt-1.5" autoComplete="off" autoCapitalize="none" spellCheck={false} value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t.placeholder} />
      </label>
      <label className="block text-sm font-semibold">Пароль
        <input className="input mt-1.5" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {captcha && (
        <div className="space-y-2 rounded-2xl bg-line-3 p-3">
          <p className="text-sm font-semibold">{captcha.message}</p>
          {captcha.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captcha.image} alt="Код с картинки" className="h-16 rounded-lg bg-white" />
          ) : (
            <p className="text-sm text-muted">Картинка не загрузилась — нажми «Войти» ещё раз.</p>
          )}
          <input className="input" inputMode="text" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Код с картинки" aria-label="Код с картинки" />
        </div>
      )}
      <p className="text-xs text-muted">{t.note}</p>
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={!ready || busy}>{busy ? (system === "emaktab" ? "Загружаем отметки… (до минуты)" : "Загружаем оценки…") : captcha ? "Войти с кодом" : "Войти и загрузить оценки"}</button>
    </form>
  );
}

function FileImport({ source, onResult }: { source: "photo" | "emis"; onResult: (r: ImportResult) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!file) return;
    if (file.size > 8_000_000) return setErr("Файл больше 8 МБ — сделай скриншот поменьше.");
    setBusy(true);
    setErr(null);
    const f = await readFile(file).catch(() => null);
    if (!f || f.base64.length > 4_200_000) {
      setBusy(false);
      return setErr("Не получилось прочитать файл. Подойдёт фото, скриншот или PDF до 3 МБ.");
    }
    const r = await apiFetch("/api/grades/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source: "file", file: f }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (j?.status === "ok") return onResult({ items: j.items, scale: j.scale, source, period: j.period ?? undefined, grade: j.grade, note: j.via === "ai" ? "Распознано ИИ — проверь оценки перед сохранением." : undefined });
    setErr(j?.message ?? "Не получилось распознать оценки.");
  }
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm">
        <span className="min-w-0 truncate font-semibold">{file ? file.name : "Выбрать фото, скриншот или PDF"}</span>
        <span className="btn-secondary flex-none px-3 py-1.5 text-sm">Файл</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }} />
      </label>
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      <button className="btn-primary" disabled={!file || busy} onClick={go}>{busy ? "Распознаём…" : "Распознать оценки"}</button>
    </div>
  );
}

function TextImport({ source, onResult, big }: { source: "text" | "emis"; onResult: (r: ImportResult) => void; big?: boolean }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function go() {
    const r = parseGradesText(text);
    if (!r) return setErr("Не нашли строк вида «предмет — оценка». Скопируй таблицу целиком вместе с названиями предметов.");
    onResult({ items: r.items, scale: r.scale, source, note: `Нашли предметов: ${r.items.length}.` });
  }
  return (
    <div className="space-y-2">
      {big && <p className="text-sm text-body">Выдели таблицу оценок в eMaktab, EMIS или в любом файле, скопируй и вставь сюда. Каждая строка — предмет и оценки: «Matematika 5 4 5» или «Физика — 4,6».</p>}
      <textarea className={`input ${big ? "min-h-48" : "min-h-28"} font-mono text-sm`} value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} placeholder={"Matematika 5 4 5 5\nFizika 4.6\nIngliz tili 5"} aria-label="Таблица оценок" />
      {err && <p className="text-sm font-semibold text-red">{err}</p>}
      <button className={big ? "btn-primary" : "btn-secondary"} disabled={!text.trim()} onClick={go}>Разобрать таблицу</button>
    </div>
  );
}
