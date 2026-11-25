"use client";

import { track } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import LoginCard from "@/components/auth/LoginCard";
import MajorPicker from "@/components/MajorPicker";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { load, save, useStore } from "@/lib/clientStore";
import { contactSchema, profileSchema } from "@/lib/profileSchema";
import CountryPicker from "@/components/CountryPicker";
import SchoolConnect from "@/components/diary/SchoolConnect";
import NumberInput from "@/components/NumberInput";
import CertificateUpload from "@/components/quiz/CertificateUpload";
import type { ImportResult } from "@/components/grades/GradesImport";
import { SOURCE_NAME } from "@/lib/diary";
import { gradesSummary } from "@/lib/grades";
import { gradesFrom } from "@/lib/schoolImport";
import { isCountry } from "@/lib/countries";
import type { AchievementLevel, Profile } from "@/lib/types";

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

// Анкета — первый шаг регистрации: после неё вход (Telegram, Google или почта), и только потом кабинет.
export default function Quiz() {
  const router = useRouter();
  const { user, enabled, ready, stateReady } = useAuth();
  const [self, setSelf] = useState("/quiz");
  const [registering, setRegistering] = useState(false);
  const [next, setNext] = useState("/dashboard");
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(EMPTY);
  const [contact, setContact] = useState({ fullName: "", phone: "+998 ", email: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fillName, setFillName] = useState(true);
  const store = useStore();
  const hasProfile = Boolean(store?.profile && store.role !== "parent");
  // /quiz?edit=1 — осознанно пройти анкету заново (из профиля); иначе вошедший с анкетой уходит в кабинет.
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setEditing(new URLSearchParams(location.search).has("edit"));
  }, []);
  useEffect(() => {
    if (enabled && user && stateReady && hasProfile && !editing && !new URLSearchParams(location.search).has("edit")) router.replace(next);
  }, [enabled, user, stateReady, hasProfile, editing, next, router]);
  const [filled, setFilled] = useState<string | null>(null);

  useEffect(() => {
    const s = load();
    const sp = new URLSearchParams(location.search);
    setSelf(`/quiz${location.search}`);
    const n = sp.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/quiz")) setNext(n);
    const country = sp.get("country");
    const base = { ...EMPTY, ...(s.draft ?? {}) };
    if (country && isCountry(country) && !base.targetCountries.includes(country)) {
      base.targetCountries = [...base.targetCountries, country];
    }
    if (s.draft || country) setP(base);
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

  // Автозаполнение из eMaktab/EMIS: класс, город, GPA и оценки, по желанию — имя. Дневник сохраняется в браузере
  // и после регистрации переносится в аккаунт.
  const fillFrom = (r: ImportResult) => {
    const grades = r.items.length ? gradesFrom(r) : undefined;
    // Средний — как везде на сайте: без физкультуры, музыки и т. п. (gradesSummary).
    const avg = grades ? gradesSummary(grades, [])?.average ?? null : null;
    const gpa = avg == null ? null : r.scale === 100 ? Math.round(avg) : Math.round((r.scale === 10 ? avg / 2 : avg) * 100) / 100;
    const grade = r.person?.grade ?? r.grade ?? null;
    set({
      ...(grade && grade >= 8 && grade <= 13 ? { grade } : {}),
      ...(!p.city.trim() && r.person?.region ? { city: r.person.region } : {}),
      ...(gpa != null ? { gpa, gpaScale: r.scale === 100 ? 100 : 5, grades } : {}),
    });
    const name = [r.person?.firstName, r.person?.lastName].filter(Boolean).join(" ");
    if (fillName && name) {
      setContact((c) => ({ ...c, fullName: name }));
      save({ contact: { fullName: name, phone: contact.phone, email: contact.email } });
    }
    if (r.diary) save({ diary: r.diary });
    setFilled(`Заполнено из ${SOURCE_NAME[r.source as "emis" | "emaktab"] ?? r.source}: ${[grade ? "класс" : null, r.person?.region && !p.city.trim() ? "город" : null, gpa != null ? `GPA ${gpa} и ${r.items.length} предметов` : null, fillName && name ? "имя" : null].filter(Boolean).join(", ")}. Проверь ответы и продолжай.`);
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
      track("profile_complete", { grade: prof.data.grade, major: prof.data.major });
      // Уже вошёл — сразу в кабинет; иначе последний шаг — регистрация (анкета перенесётся в аккаунт).
      if (user || !enabled) router.push(next);
      else {
        setRegistering(true);
        window.scrollTo({ top: 0 });
      }
    } catch {
      setError("Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.");
      setBusy(false);
    }
  }


  if (registering) {
    return (
      <div className="space-y-5 pt-2">
        <div className="rounded-2xl bg-green-soft px-5 py-4 text-green">
          <div className="font-extrabold">Анкета сохранена</div>
          <p className="mt-1 text-sm">Последний шаг — регистрация. Профиль, подбор и план сохранятся в аккаунте; кабинет откроется сразу после входа.</p>
        </div>
        <div className="flex justify-center"><LoginCard next={next} mode="register" /></div>
      </div>
    );
  }

  // Сначала регистрация (Telegram, Google или почта), потом анкета: после входа вернёмся сюда же.
  // Аккаунт уже с анкетой (вошёл тем же Google/Telegram/почтой) — анкету не повторяем, сразу в кабинет.
  if (enabled && (!ready || (user && !stateReady))) return <div className="card h-64 animate-pulse" aria-busy />;
  if (enabled && user && hasProfile && !editing) return <div className="card h-64 animate-pulse" aria-busy />;
  if (enabled && !user) {
    return (
      <div className="space-y-5 pt-2">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight sm:text-[34px]">Создай аккаунт — это минута</h1>
          <p className="mt-2 text-body">Войди через Telegram, Google или почту. Потом короткая анкета: класс, оценки, тесты и цели. Оценки и имя можно подтянуть из eMaktab или EMIS, а сертификаты IELTS и SAT — загрузить файлом.</p>
        </div>
        <div className="flex justify-center"><LoginCard next={self} mode="register" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted">
          <span>{`Шаг ${step + 1} из ${STEPS}`}</span>
          <span>{Math.round(((step + 1) / STEPS) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
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
          <div className="space-y-3 rounded-2xl bg-line-3 p-4">
            <div>
              <b className="block">Не помнишь средний балл? Возьмём из электронного дневника</b>
              <p className="mt-0.5 text-sm text-body">Войди через eMaktab или EMIS — подставим GPA, оценки по предметам, класс и по желанию имя. Пароль не сохраняется.</p>
            </div>
            <SchoolConnect onDone={fillFrom}>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5" checked={fillName} onChange={(e) => setFillName(e.target.checked)} />
                Заполнить имя и фамилию из дневника
              </label>
            </SchoolConnect>
            {filled && <p className="rounded-xl bg-green-soft px-3 py-2 text-sm font-semibold text-green" role="status">{filled}</p>}
          </div>
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
            <NumberInput
              aria-label="Средний балл"
              placeholder={p.gpaScale === 5 ? "например 4,6" : "например 88"}
              value={p.gpa}
              onChange={(v) => set({ gpa: v })}
            />
            {p.gpa != null && (p.gpa <= 0 || p.gpa > p.gpaScale) && <p className="text-sm font-semibold text-red">{`Средний балл — от 1 до ${p.gpaScale}.`}</p>}
          </Q>
        )}

        {step === 2 && (
          <TestStep exam="ielts" title="IELTS" placeholder="например 6,5" value={p.ielts} onChange={(v) => set({ ielts: v })}
            onCertificate={(v, official, date) => set({ ielts: v, testProof: { ...p.testProof, ielts: { official, date } } })} />
        )}

        {step === 3 && (
          <TestStep exam="sat" title="SAT" placeholder="например 1350" value={p.sat} onChange={(v) => set({ sat: v })}
            onCertificate={(v, official, date) => set({ sat: v, testProof: { ...p.testProof, sat: { official, date } } })} />
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
              <NumberInput
                className="input w-24"
                decimals={false}
                aria-label="Сколько всего активностей"
                value={p.activitiesCount}
                onChange={(v) => set({ activitiesCount: Math.max(0, Math.min(30, v ?? 0)) })}
              />
            </label>
            <button className="chip w-full" data-on={p.ledSomething} onClick={() => set({ ledSomething: !p.ledSomething })}>
              {p.ledSomething ? "✓ " : ""}Я сам(а) запустил(а) или вёл(а) проект, клуб или команду
            </button>
          </Q>
        )}

        {step === 5 && (
          <Q title="Где хочешь учиться?" hint="Можно выбрать несколько. Узбекские вузы покажем всегда — как запасной вариант.">
            <CountryPicker value={p.targetCountries} onChange={(v) => set({ targetCountries: v })} />
          </Q>
        )}

        {step === 6 && (
          <Q title="Какие направления тебе интересны?" hint="Можно несколько — первое станет основным. Минор и своё направление — по желанию.">
            <MajorPicker value={p} onChange={(v) => set(v)} />
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
              className="w-full accent-[var(--pri)]"
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

        {error && <p className="rounded-xl bg-red-soft px-4 py-3 text-sm text-red">{error}</p>}

        <div className="flex gap-3">
          {step > 0 && <button className="btn-secondary" onClick={() => go(step - 1)}>Назад</button>}
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

function TestStep(props: { exam: "ielts" | "sat"; title: string; placeholder: string; value: number | null; onChange: (v: number | null) => void; onCertificate: (v: number, official: boolean, date: string | null) => void }) {
  const [notTaken, setNotTaken] = useState(false);
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
        <>
          <NumberInput aria-label={`Балл ${props.title}`} decimals={props.exam === "ielts"} placeholder={props.placeholder} value={props.value} onChange={props.onChange} />
          <CertificateUpload exam={props.exam} onScore={props.onCertificate} />
        </>
      )}
    </Q>
  );
}
