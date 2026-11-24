"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { load, save } from "@/lib/clientStore";
import { t } from "@/lib/i18n/ru";
import { COUNTRIES, MAJORS, contactSchema, profileSchema } from "@/lib/profileSchema";
import type { AchievementLevel, CountryCode, Major, Profile } from "@/lib/types";

const EMPTY: Profile = {
  grade: 10,
  city: "",
  gpa: null,
  gpaScale: 5,
  ielts: null,
  sat: null,
  achievementsText: "",
  bestAchievementLevel: "none",
  activitiesCount: 0,
  ledSomething: false,
  targetCountries: [],
  major: "cs",
  budgetUsd: 3000,
  essays: "not_assessed",
  recommendations: "not_assessed",
};

const LEVELS: { v: AchievementLevel; label: string }[] = [
  { v: "none", label: "Пока нет" },
  { v: "school", label: "Школа" },
  { v: "city", label: "Город / область" },
  { v: "national", label: "Республика" },
  { v: "international", label: "Международный" },
];

const STEPS = 9; // 8 вопросов + контакты

export default function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(EMPTY);
  const [contact, setContact] = useState({ fullName: "", phone: "+998 ", email: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = load();
    if (s.draft) setP({ ...EMPTY, ...s.draft });
    if (typeof s.step === "number") setStep(Math.min(s.step, STEPS - 1));
    if (s.contact) setContact({ fullName: s.contact.fullName, phone: s.contact.phone, email: s.contact.email ?? "" });
  }, []);

  const set = (patch: Partial<Profile>) => {
    const next = { ...p, ...patch };
    setP(next);
    save({ draft: next });
  };
  const go = (n: number) => {
    setError(null);
    setStep(n);
    save({ step: n });
    window.scrollTo({ top: 0 });
  };

  const stepValid = (): boolean => {
    switch (step) {
      case 0: return p.city.trim().length > 0;
      case 1: return p.gpa != null && p.gpa > 0 && p.gpa <= p.gpaScale;
      case 2: return p.ielts == null || (p.ielts >= 1 && p.ielts <= 9);
      case 3: return p.sat == null || (p.sat >= 400 && p.sat <= 1600);
      case 5: return p.targetCountries.length > 0;
      default: return true;
    }
  };

  async function submit() {
    const prof = profileSchema.safeParse(p);
    const cont = contactSchema.safeParse(contact);
    if (!prof.success) return setError("Проверьте ответы анкеты.");
    if (!cont.success) return setError("Укажите имя и телефон в формате +998 90 123 45 67.");
    if (!consent) return setError("Нужно согласие на обработку данных.");
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: prof.data, contact: cont.data, parentConsent: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      save({ profile: prof.data, contact: cont.data, profileId: json.id, step: 0, draft: prof.data });
      router.push("/result");
    } catch {
      setError("Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.");
      setBusy(false);
    }
  }

  const toggleCountry = (c: CountryCode) =>
    set({ targetCountries: p.targetCountries.includes(c) ? p.targetCountries.filter((x) => x !== c) : [...p.targetCountries, c] });

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted">
          <span>Шаг {step + 1} из {STEPS}</span>
          <span>{Math.round(((step + 1) / STEPS) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="card space-y-5">
        {step === 0 && (
          <Q title="В каком ты классе и откуда?">
            <div className="grid grid-cols-3 gap-2">
              {[8, 9, 10, 11, 12, 13].map((g) => (
                <button key={g} className="chip text-center" data-on={p.grade === g} onClick={() => set({ grade: g })}>
                  {g <= 11 ? `${g} класс` : `${g - 11} курс`}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Город, например Ташкент" value={p.city} onChange={(e) => set({ city: e.target.value })} />
          </Q>
        )}

        {step === 1 && (
          <Q title="Средний балл (GPA)" hint="Средняя оценка за последний год.">
            <div className="grid grid-cols-2 gap-2">
              {([5, 100] as const).map((s) => (
                <button key={s} className="chip text-center" data-on={p.gpaScale === s} onClick={() => set({ gpaScale: s, gpa: null })}>
                  Шкала {s === 5 ? "1–5" : "0–100"}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              step={p.gpaScale === 5 ? 0.1 : 1}
              min={0}
              max={p.gpaScale}
              placeholder={p.gpaScale === 5 ? "например 4.6" : "например 88"}
              value={p.gpa ?? ""}
              onChange={(e) => set({ gpa: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Q>
        )}

        {step === 2 && (
          <TestStep title="IELTS" placeholder="например 6.5" step={0.5} value={p.ielts} onChange={(v) => set({ ielts: v })} />
        )}

        {step === 3 && (
          <TestStep title="SAT" placeholder="например 1350" step={10} value={p.sat} onChange={(v) => set({ sat: v })} />
        )}

        {step === 4 && (
          <Q title="Достижения и активности" hint="Олимпиады, проекты, волонтёрство, кружки, работа. Пиши как есть.">
            <textarea
              className="input min-h-28"
              placeholder="Например: 2 место на областной олимпиаде по информатике, сделал сайт для школы, волонтёр в фонде…"
              value={p.achievementsText}
              onChange={(e) => set({ achievementsText: e.target.value })}
            />
            <p className="text-sm font-medium">Самый высокий уровень достижения</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LEVELS.map((l) => (
                <button key={l.v} className="chip" data-on={p.bestAchievementLevel === l.v} onClick={() => set({ bestAchievementLevel: l.v })}>
                  {l.label}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Сколько всего активностей?</span>
              <input
                className="input w-24"
                type="number"
                min={0}
                max={30}
                value={p.activitiesCount}
                onChange={(e) => set({ activitiesCount: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}
              />
            </label>
            <button className="chip w-full" data-on={p.ledSomething} onClick={() => set({ ledSomething: !p.ledSomething })}>
              {p.ledSomething ? "✓ " : ""}Я сам(а) запустил(а) или вёл(а) проект, клуб или команду
            </button>
          </Q>
        )}

        {step === 5 && (
          <Q title="Где хочешь учиться?" hint="Можно выбрать несколько. Узбекские вузы покажем всегда — как запасной вариант.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <button key={c} className="chip" data-on={p.targetCountries.includes(c)} onClick={() => toggleCountry(c)}>
                  {t.countries[c]}
                </button>
              ))}
            </div>
          </Q>
        )}

        {step === 6 && (
          <Q title="Какая специальность?">
            <div className="grid gap-2 sm:grid-cols-2">
              {MAJORS.map((m) => (
                <button key={m} className="chip" data-on={p.major === m} onClick={() => set({ major: m as Major })}>
                  {t.majors[m]}
                </button>
              ))}
            </div>
          </Q>
        )}

        {step === 7 && (
          <Q title="Сколько семья может платить в год без гранта?" hint="Учёба и жизнь вместе. Это нужно, чтобы найти запасной вариант.">
            <div className="text-3xl font-bold">${p.budgetUsd.toLocaleString("ru-RU")}</div>
            <input
              type="range"
              min={0}
              max={60000}
              step={500}
              value={p.budgetUsd}
              onChange={(e) => set({ budgetUsd: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-xs text-muted"><span>$0</span><span>$60 000+</span></div>
          </Q>
        )}

        {step === 8 && (
          <Q title="Куда отправить результат?" hint="Контакты нужны, чтобы сохранить профиль. Вузам они не передаются без твоей кнопки.">
            <input className="input" placeholder="Имя и фамилия" value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
            <input className="input" type="tel" placeholder="+998 90 123 45 67" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <input className="input" type="email" placeholder="Email (необязательно)" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Я согласен(на) на обработку данных. {p.grade <= 11 && "Если мне нет 18 лет — согласие дал мой родитель."}
              </span>
            </label>
          </Q>
        )}

        {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          {step > 0 && <button className="btn-ghost" onClick={() => go(step - 1)}>Назад</button>}
          {step < STEPS - 1 ? (
            <button className="btn-primary flex-1" disabled={!stepValid()} onClick={() => go(step + 1)}>Дальше</button>
          ) : (
            <button className="btn-primary flex-1" disabled={busy} onClick={submit}>{busy ? "Считаем…" : "Показать результат"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function TestStep(props: { title: string; placeholder: string; step: number; value: number | null; onChange: (v: number | null) => void }) {
  const [notTaken, setNotTaken] = useState(props.value == null);
  return (
    <Q title={`Твой результат ${props.title}`} hint="Если ещё не сдавал — так и отметь, это нормально.">
      <button
        className="chip w-full"
        data-on={notTaken}
        onClick={() => {
          setNotTaken(!notTaken);
          if (!notTaken) props.onChange(null);
        }}
      >
        {notTaken ? "✓ " : ""}Ещё не сдавал(а)
      </button>
      {!notTaken && (
        <input
          className="input"
          type="number"
          inputMode="decimal"
          step={props.step}
          placeholder={props.placeholder}
          value={props.value ?? ""}
          onChange={(e) => props.onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      )}
    </Q>
  );
}
