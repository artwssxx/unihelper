"use client";

import { COUNTRIES, MAJORS } from "@/lib/profileSchema";

// Универсальная форма для объектов контента: строит поля по значению и подсказкам ниже.

type V = unknown;
type Obj = Record<string, V>;

const LABELS: Record<string, string> = {
  id: "ID (латиница, цифры, дефис)", name: "Программа / грант", university: "Вуз", country: "Страна", city: "Город",
  isLocal: "Узбекский вуз", isPartner: "Партнёр (платный)", majors: "Специальности", url: "Официальный сайт", qsRank: "Место в QS",
  acceptanceRate: "Acceptance rate (0–1)", typical: "Типичный профиль поступивших", gpa100: "GPA (из 100)", ielts: "IELTS", sat: "SAT",
  requirements: "Формальные требования", minIelts: "Мин. IELTS", minGpa100: "Мин. GPA (из 100)", satRequired: "SAT обязателен",
  tuitionUsd: "Обучение, $ в год", livingUsd: "Проживание, $ в год", funding: "Финансирование", type: "Тип", basis: "Основа",
  needBlindIntl: "Need-blind для иностранцев", availableToUz: "Доступно гражданам Узбекистана", note: "Примечание",
  weights: "Вес качественных компонентов (0–1)", essay: "Эссе", recommendations: "Рекомендации", interview: "Интервью",
  isFullGrant: "Полный грант", deadlineNote: "Сроки (текст)", verifiedAt: "Проверено экспертом (дата ISO или пусто)",
  title: "Название", organizer: "Организатор", location: "Место", online: "Онлайн", startsAt: "Начало (ISO-дата)", tags: "Теги (по строке)",
  registrationMode: "Регистрация", externalUrl: "Ссылка на регистрацию", capacity: "Мест", registered: "Записалось", questions: "Вопросы анкеты (по строке)",
  isPromoted: "Реклама (продвижение)", description: "Описание", courseId: "Курс", minutes: "Минут", domains: "Темы мока (по строке)",
  summary: "Конспект (пункт на строку)", quiz: "ID вопросов мини-теста (по строке)", isPro: "Только Pro", videoId: "ID видео",
};

const ENUMS: Record<string, { v: string; l: string }[]> = {
  country: COUNTRIES.map((c) => ({ v: c, l: c })),
  "funding.type": [{ v: "none", l: "нет" }, { v: "partial", l: "частичное" }, { v: "full", l: "полное" }],
  "funding.basis": [{ v: "need", l: "need-based" }, { v: "merit", l: "merit" }, { v: "government", l: "государственный" }, { v: "none", l: "—" }],
  type: [
    { v: "olympiad", l: "Олимпиада" }, { v: "volunteering", l: "Волонтёрство" }, { v: "summer_school", l: "Летняя школа" },
    { v: "hackathon", l: "Хакатон" }, { v: "webinar", l: "Вебинар" }, { v: "club", l: "Клуб / кейс" },
  ],
  registrationMode: [{ v: "unihelper", l: "через Unihelper" }, { v: "external", l: "на сайте организатора" }],
  courseId: [{ v: "sat-math", l: "SAT Math" }, { v: "sat-rw", l: "SAT Reading & Writing" }, { v: "ielts-reading", l: "IELTS Reading" }, { v: "essays", l: "Эссе и гранты" }],
};

/** Поля, которые могут быть null: число или строка. */
const NULLABLE_NUM = new Set(["qsRank", "acceptanceRate", "gpa100", "ielts", "sat", "minIelts", "minGpa100"]);
const NULLABLE_STR = new Set(["url", "verifiedAt", "videoId"]);
const NULLABLE_BOOL = new Set(["needBlindIntl"]);
const LONG = new Set(["description", "note", "deadlineNote"]);

export default function AutoForm({ value, onChange, lockId }: { value: Obj; onChange: (v: Obj) => void; lockId?: boolean }) {
  return <Fields obj={value} path="" onChange={onChange} lockId={lockId} />;
}

function Fields({ obj, path, onChange, lockId }: { obj: Obj; path: string; onChange: (v: Obj) => void; lockId?: boolean }) {
  const set = (k: string, v: V) => onChange({ ...obj, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(obj).map(([k, v]) => {
        const full = path ? `${path}.${k}` : k;
        const label = LABELS[k] ?? k;
        if (k === "majors") return <Majors key={k} v={v} set={(x) => set(k, x)} />;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          return (
            <fieldset key={k} className="rounded-2xl border border-line p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-extrabold">{label}</legend>
              <Fields obj={v as Obj} path={full} onChange={(x) => set(k, x)} />
            </fieldset>
          );
        }
        if (Array.isArray(v)) {
          return (
            <label key={k} className="block text-sm font-semibold sm:col-span-2">
              {label}
              <textarea
                className="input mt-1.5 min-h-20 font-normal"
                value={(v as string[]).join("\n")}
                onChange={(e) => set(k, e.target.value.split("\n").map((x) => x.trimEnd()).filter((x, i, a) => x || i < a.length - 1))}
              />
            </label>
          );
        }
        if (typeof v === "boolean" || NULLABLE_BOOL.has(k)) {
          if (NULLABLE_BOOL.has(k)) {
            return (
              <label key={k} className="block text-sm font-semibold">
                {label}
                <select className="input mt-1.5" value={v == null ? "" : String(v)} onChange={(e) => set(k, e.target.value === "" ? null : e.target.value === "true")}>
                  <option value="">неизвестно</option><option value="true">да</option><option value="false">нет</option>
                </select>
              </label>
            );
          }
          return (
            <label key={k} className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-3 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-[var(--pri)]" checked={Boolean(v)} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          );
        }
        const en = ENUMS[full] ?? ENUMS[k];
        if (en) {
          return (
            <label key={k} className="block text-sm font-semibold">
              {label}
              <select className="input mt-1.5" value={String(v ?? "")} onChange={(e) => set(k, e.target.value)}>
                {en.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </label>
          );
        }
        if (typeof v === "number" || NULLABLE_NUM.has(k)) {
          return (
            <label key={k} className="block text-sm font-semibold">
              {label}
              <input
                className="input mt-1.5"
                type="number"
                step="any"
                value={v == null ? "" : String(v)}
                placeholder={NULLABLE_NUM.has(k) ? "нет данных" : undefined}
                onChange={(e) => set(k, e.target.value === "" ? (NULLABLE_NUM.has(k) ? null : 0) : Number(e.target.value))}
              />
            </label>
          );
        }
        const str = (v as string | null) ?? "";
        return (
          <label key={k} className={`block text-sm font-semibold ${LONG.has(k) ? "sm:col-span-2" : ""}`}>
            {label}
            {LONG.has(k) ? (
              <textarea className="input mt-1.5 min-h-20 font-normal" value={str} onChange={(e) => set(k, e.target.value)} />
            ) : (
              <input
                className="input mt-1.5 font-normal"
                value={str}
                disabled={k === "id" && lockId}
                placeholder={NULLABLE_STR.has(k) ? "пусто" : undefined}
                onChange={(e) => set(k, NULLABLE_STR.has(k) && e.target.value === "" ? null : e.target.value)}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function Majors({ v, set }: { v: V; set: (x: V) => void }) {
  const any = v === "any";
  const list = Array.isArray(v) ? (v as string[]) : [];
  return (
    <fieldset className="rounded-2xl border border-line p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-extrabold">{LABELS.majors}</legend>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4" checked={any} onChange={(e) => set(e.target.checked ? "any" : [])} /> любые
      </label>
      {!any && (
        <div className="mt-3 flex flex-wrap gap-2">
          {MAJORS.map((m) => (
            <button
              type="button"
              key={m}
              className="chip px-3 py-1.5 text-sm"
              data-on={list.includes(m)}
              aria-pressed={list.includes(m)}
              onClick={() => set(list.includes(m) ? list.filter((x) => x !== m) : [...list, m])}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
