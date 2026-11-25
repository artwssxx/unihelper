"use client";

import { useState } from "react";
import { Check, Close } from "@/components/icons";
import GradesImport, { type ImportResult } from "@/components/grades/GradesImport";
import { update } from "@/lib/clientStore";
import { gradesSummary, gradeText, NON_ACADEMIC, SUBJECT_RU, subjectKey, to100, type GradeItem, type Grades, type GradeScale } from "@/lib/grades";
import { majorsLabel } from "@/lib/majorsLabel";
import { profileMajors } from "@/lib/profileConst";
import { useProfile } from "@/lib/useProfile";

const SOURCE: Record<Grades["source"], string> = { emaktab: "из eMaktab", emis: "из EMIS", photo: "по фото", text: "из таблицы", manual: "вручную" };
const BASIC: (keyof typeof SUBJECT_RU)[] = ["math", "physics", "chemistry", "biology", "informatics", "english", "native", "literature", "history", "geography"];

type Draft = { items: (Omit<GradeItem, "grade"> & { grade: number | null })[]; scale: GradeScale; source: Grades["source"]; period?: string; grade?: number | null; note?: string };

/** Оценки по предметам в профиле: сводка, импорт (eMaktab, EMIS, фото, таблица), ручная правка. */
export default function GradesCard() {
  const { store } = useProfile();
  const profile = store?.profile;
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [updGrade, setUpdGrade] = useState(true);
  if (!profile) return null;
  const g = profile.grades;
  const majors = profileMajors(profile);
  const s = gradesSummary(g, majors);

  const fromImport = (r: ImportResult) => {
    setImporting(false);
    // Отметки «спецпредмет», поставленные раньше, переносим на те же предметы.
    const was = new Map((g?.items ?? []).map((i) => [i.subject.toLowerCase(), i.special]));
    setDraft({ items: r.items.map((i) => ({ ...i, special: i.special ?? was.get(i.subject.toLowerCase()) })), scale: r.scale, source: r.source, period: r.period, grade: r.grade, note: r.note });
    setUpdGrade(true);
  };
  const manual = () =>
    setDraft(g ? { items: g.items, scale: g.scale, source: g.source, period: g.period } : { items: BASIC.map((k) => ({ subject: SUBJECT_RU[k], key: k, grade: null })), scale: 5, source: "manual" });

  function save() {
    if (!draft) return;
    const items = draft.items
      .filter((i) => i.subject.trim() && i.grade != null && i.grade > 0 && i.grade <= draft.scale)
      .map((i) => ({ ...i, subject: i.subject.trim(), key: subjectKey(i.subject), grade: Math.round((i.grade as number) * 100) / 100, ...(i.special ? { special: true } : { special: undefined }) }));
    const next: Grades = { items, scale: draft.scale, source: draft.source, updatedAt: new Date().toISOString(), ...(draft.period ? { period: draft.period } : {}), useForGpa: g?.useForGpa ?? true };
    const newGrade = updGrade && draft.grade && draft.grade !== profile!.grade ? draft.grade : null;
    update((st) => ({ profile: st.profile ? { ...st.profile, grades: items.length ? next : undefined, ...(newGrade ? { grade: newGrade } : {}) } : st.profile }));
    setDraft(null);
  }
  const remove = () => {
    if (confirm("Удалить оценки по предметам? GPA снова будет браться из анкеты.")) update((st) => ({ profile: st.profile ? { ...st.profile, grades: undefined } : st.profile }));
  };
  const toggleGpa = (on: boolean) => update((st) => ({ profile: st.profile?.grades ? { ...st.profile, grades: { ...st.profile.grades, useForGpa: on } } : st.profile }));

  return (
    <section className="card space-y-4" aria-labelledby="gradesT">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="gradesT" className="m-0 text-xl font-extrabold">Оценки по предметам</h2>
          <p className="mt-1 max-w-[620px] text-sm text-body">
            {g ? `Загружено ${SOURCE[g.source]}${g.period ? ` · ${g.period}` : ""} · ${new Date(g.updatedAt).toLocaleDateString("ru-RU")}` : "Загрузи оценки из eMaktab, EMIS или по фото табеля — GPA посчитается сам, а профильные предметы и спецпредметы повлияют на силу профиля и подбор вузов."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setImporting(true)}>{g ? "Обновить" : "Загрузить оценки"}</button>
          <button className="btn-secondary" onClick={manual}>{g ? "Изменить" : "Ввести вручную"}</button>
        </div>
      </div>

      {s && g && !draft && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Средний балл" value={gradeText(s.average, s.scale)} hint={`${s.count} предметов, без физкультуры и музыки`} />
            <Stat label={`Профильные: ${majorsLabel(profile)}`} value={s.core.average100 == null ? "нет оценок" : `${Math.round(s.core.average100)} из 100`} hint={s.core.items.length ? s.core.items.map((i) => i.subject).join(", ") : "добавь профильные предметы"} tone={s.weakCore.length ? "warn" : s.core.average100 != null && s.core.average100 >= 90 ? "good" : undefined} />
            <Stat label="Спецпредметы" value={s.special.length ? String(s.special.length) : "не отмечены"} hint={s.special.length ? s.special.map((i) => i.subject).join(", ") : "отметь углублённые предметы в «Изменить»"} />
          </div>
          {s.weakCore.length > 0 && (
            <p className="rounded-2xl bg-orange-soft px-4 py-3 text-sm font-semibold text-orange-ink-2">
              Профильный предмет ниже 3.5 из 5: <span translate="no">{s.weakCore.map((i) => i.subject).join(", ")}</span>. Пока он такой, «Высокое соответствие» вузам не ставим — подтяни его в этом полугодии.
            </p>
          )}
          <div className="flex flex-wrap gap-2" translate="no">
            {g.items.map((i) => (
              <span key={i.subject} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${s.core.keys.includes(i.key) ? "bg-primary-soft text-primary-ink" : "bg-line-3 text-ink-2"} ${NON_ACADEMIC.has(i.key) ? "opacity-60" : ""}`}>
                {i.subject} <b>{i.grade}</b>{i.special ? " · спец" : ""}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={g.useForGpa !== false} onChange={(e) => toggleGpa(e.target.checked)} />
              <span>{`Считать GPA по этим оценкам (сейчас ≈ ${Math.round(s.average100)} из 100)`}</span>
            </label>
            <button className="text-sm font-semibold text-muted underline" onClick={remove}>Удалить оценки</button>
          </div>
        </>
      )}

      {draft && (
        <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)}
          gradeHint={draft.grade && draft.grade !== profile.grade ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={updGrade} onChange={(e) => setUpdGrade(e.target.checked)} />
              Обновить класс в профиле: {draft.grade <= 11 ? `${draft.grade} класс` : `${draft.grade - 11} курс`}
            </label>
          ) : null}
        />
      )}

      {importing && <GradesImport onResult={fromImport} onClose={() => setImporting(false)} />}
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "good" | "warn" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "warn" ? "bg-orange-soft" : tone === "good" ? "bg-green-soft" : "bg-line-3"}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      <div className="mt-1 truncate text-xs text-muted" translate="no" title={hint}>{hint}</div>
    </div>
  );
}

function Editor({ draft, setDraft, onSave, onCancel, gradeHint }: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onCancel: () => void; gradeHint: React.ReactNode }) {
  const setItem = (i: number, patch: Partial<Draft["items"][number]>) => setDraft({ ...draft, items: draft.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const bad = draft.items.some((i) => i.grade != null && (i.grade <= 0 || i.grade > draft.scale));
  const filled = draft.items.filter((i) => i.subject.trim() && i.grade != null).length;
  return (
    <div className="space-y-3 rounded-2xl border border-line p-3 sm:p-4">
      {draft.note && <p className="text-sm font-semibold text-primary-ink">{draft.note}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">Шкала
          <select className="input w-auto py-2" value={draft.scale} onChange={(e) => setDraft({ ...draft, scale: Number(e.target.value) as GradeScale })}>
            <option value={5}>из 5</option><option value={10}>из 10</option><option value={100}>из 100</option>
          </select>
        </label>
        <span className="text-xs text-muted">Отметь «спец» у предметов, которые учишь углублённо (профильный класс, спецпредмет лицея).</span>
      </div>
      <datalist id="uh-subjects">{Object.values(SUBJECT_RU).filter((x) => x !== SUBJECT_RU.other).map((n) => <option key={n} value={n} />)}</datalist>
      <ul className="space-y-2">
        {draft.items.map((it, i) => {
          const pct = it.grade != null ? to100(it.grade, draft.scale) : null;
          return (
            <li key={i} className="flex items-center gap-2">
              <input className="input min-w-0 flex-1" list="uh-subjects" value={it.subject} translate="no" aria-label="Предмет" onChange={(e) => setItem(i, { subject: e.target.value, key: subjectKey(e.target.value) })} />
              <input className={`input w-[84px] flex-none text-center ${pct != null && pct < 70 ? "text-orange-ink-2" : ""}`} type="number" inputMode="decimal" step="0.01" min={1} max={draft.scale} aria-label="Оценка"
                value={it.grade ?? ""} placeholder="—" onChange={(e) => setItem(i, { grade: e.target.value === "" ? null : Number(e.target.value) })} />
              <button type="button" className="chip h-10 flex-none px-3 text-sm" data-on={Boolean(it.special)} aria-pressed={Boolean(it.special)} onClick={() => setItem(i, { special: !it.special })}>спец</button>
              <button type="button" className="btn-secondary h-10 w-10 flex-none p-0" aria-label="Убрать предмет" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}><Close size={16} /></button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn-secondary" onClick={() => setDraft({ ...draft, items: [...draft.items, { subject: "", key: "other", grade: null }] })}>+ Предмет</button>
      {gradeHint}
      {bad && <p className="text-sm font-semibold text-red">Оценка должна быть от 1 до {draft.scale}.</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={bad || !filled} onClick={onSave}><Check size={16} /> Сохранить оценки ({filled})</button>
        <button className="btn-secondary" onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
}
