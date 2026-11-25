"use client";

import { useState } from "react";
import MajorPicker from "@/components/MajorPicker";
import CountryPicker from "@/components/CountryPicker";
import NumberInput from "@/components/NumberInput";
import type { AchievementLevel, Profile } from "@/lib/types";

// Родитель регистрирует ребёнка: короткая анкета (то же, что в анкете ученика), ребёнку уйдёт ссылка-приглашение.

const EMPTY: Profile = {
  grade: 10, city: "", gpa: null, gpaScale: 5, ielts: null, sat: null, achievementsText: "", bestAchievementLevel: "none",
  activitiesCount: 0, ledSomething: false, targetCountries: [], major: "cs", budgetUsd: 3000, essays: "not_assessed", recommendations: "not_assessed",
};
const LEVELS: { v: AchievementLevel; label: string }[] = [
  { v: "none", label: "Пока нет" }, { v: "school", label: "Школа" }, { v: "city", label: "Город / область" }, { v: "national", label: "Республика" }, { v: "international", label: "Международный" },
];

export default function ChildForm({ busy, onSubmit }: { busy: boolean; onSubmit: (name: string, p: Profile) => void }) {
  const [name, setName] = useState("");
  const [p, setP] = useState<Profile>(EMPTY);
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const valid = name.trim() && p.city.trim() && p.gpa != null && p.gpa > 0 && p.gpa <= p.gpaScale && p.targetCountries.length > 0;
  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(name.trim(), p); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Имя ребёнка<input className="input mt-1.5 font-normal" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Азиз" /></label>
        <label className="block text-sm font-semibold">Город<input className="input mt-1.5 font-normal" maxLength={60} value={p.city} onChange={(e) => set({ city: e.target.value })} placeholder="Ташкент" /></label>
      </div>
      <div>
        <div className="text-sm font-semibold">Класс или курс</div>
        <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[8, 9, 10, 11, 12, 13].map((g) => (
            <button type="button" key={g} className="chip justify-center" data-on={p.grade === g} onClick={() => set({ grade: g })}>{g <= 11 ? `${g} класс` : `${g - 11} курс`}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block text-sm font-semibold">
          Шкала оценок
          <select className="input mt-1.5 font-normal" value={p.gpaScale} onChange={(e) => set({ gpaScale: Number(e.target.value) as 5 | 100, gpa: null })}>
            <option value={5}>1–5</option><option value={100}>0–100</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Средний балл<NumberInput className="input mt-1.5 font-normal" value={p.gpa} onChange={(v) => set({ gpa: v })} placeholder={p.gpaScale === 5 ? "4.6" : "88"} /></label>
        <label className="block text-sm font-semibold">IELTS<NumberInput className="input mt-1.5 font-normal" value={p.ielts} onChange={(v) => set({ ielts: v })} placeholder="не сдавал" /></label>
        <label className="block text-sm font-semibold">SAT<NumberInput className="input mt-1.5 font-normal" decimals={false} value={p.sat} onChange={(v) => set({ sat: v })} placeholder="не сдавал" /></label>
      </div>
      <div>
        <div className="text-sm font-semibold">Куда хочет поступать</div>
        <div className="mt-1.5"><CountryPicker compact value={p.targetCountries} onChange={(v) => set({ targetCountries: v })} /></div>
      </div>
      <div>
        <div className="text-sm font-semibold">Направления</div>
        <div className="mt-1.5"><MajorPicker value={p} onChange={(v) => set(v)} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Лучшее достижение
          <select className="input mt-1.5 font-normal" value={p.bestAchievementLevel} onChange={(e) => set({ bestAchievementLevel: e.target.value as AchievementLevel })}>
            {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Бюджет семьи в год без гранта: ${p.budgetUsd.toLocaleString("ru-RU")}
          <input type="range" className="mt-3 w-full accent-primary" min={0} max={60000} step={500} value={p.budgetUsd} onChange={(e) => set({ budgetUsd: Number(e.target.value) })} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Достижения и занятия (по желанию)
        <textarea className="input mt-1.5 min-h-20 font-normal" maxLength={2000} value={p.achievementsText} onChange={(e) => set({ achievementsText: e.target.value, activitiesCount: e.target.value.trim() ? Math.max(p.activitiesCount, 1) : 0 })} placeholder="Олимпиады, кружки, волонтёрство, проекты…" />
      </label>
      <button className="btn-primary w-full" disabled={!valid || busy}>{busy ? "Создаём…" : "Зарегистрировать и получить ссылку для ребёнка"}</button>
      {!valid && <p className="text-xs text-muted">Нужны имя, город, средний балл и хотя бы одна страна.</p>}
    </form>
  );
}
