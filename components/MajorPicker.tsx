"use client";

import { t } from "@/lib/i18n/ru";
import { MAJORS, MAX_MAJORS, profileMajors } from "@/lib/profileConst";
import type { Major, Profile } from "@/lib/types";

type Value = Pick<Profile, "major" | "majors" | "majorOther" | "minor">;

/** Выбор направлений: несколько из списка (первое — основное), своё направление и минор по желанию. */
export default function MajorPicker({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const chosen = profileMajors(value);
  const toggle = (m: Major) => {
    const on = chosen.includes(m);
    if (on && chosen.length === 1) return; // одно направление обязательно
    const next = on ? chosen.filter((x) => x !== m) : chosen.length < MAX_MAJORS ? [...chosen, m] : chosen;
    onChange({ ...value, major: next[0], majors: next });
  };
  const makeMain = (m: Major) => onChange({ ...value, major: m, majors: [m, ...chosen.filter((x) => x !== m)] });
  return (
    <div className="space-y-4">
      <div>
        <div className="grid gap-2 sm:grid-cols-2">
          {MAJORS.map((m) => {
            const idx = chosen.indexOf(m);
            return (
              <button key={m} type="button" className="chip justify-between text-left" data-on={idx >= 0} aria-pressed={idx >= 0} onClick={() => toggle(m)}>
                <span>{t.majors[m]}</span>
                {idx === 0 && <span className="pill bg-primary px-2 py-0.5 text-[11px] text-white">основное</span>}
                {idx > 0 && <span className="pill bg-line-3 px-2 py-0.5 text-[11px] text-muted">{idx + 1}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{`Можно выбрать до ${MAX_MAJORS} — подбор покажет программы по всем. Основное — первое выбранное.`}</p>
        {chosen.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Сделать основным:</span>
            {chosen.slice(1).map((m) => (
              <button key={m} type="button" className="rounded-full border border-line px-2.5 py-1 font-bold text-primary" onClick={() => makeMain(m)}>{t.majors[m]}</button>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Своё направление (если нет в списке)
          <input className="input mt-1.5 font-normal" maxLength={60} placeholder="Например: кибербезопасность" value={value.majorOther ?? ""} onChange={(e) => onChange({ ...value, majorOther: e.target.value || undefined })} />
        </label>
        <label className="block text-sm font-semibold">
          Минор (по желанию)
          <input className="input mt-1.5 font-normal" maxLength={60} list="minor-options" placeholder="Например: экономика" value={value.minor ?? ""} onChange={(e) => onChange({ ...value, minor: e.target.value || undefined })} />
          <datalist id="minor-options">{MAJORS.map((m) => <option key={m} value={t.majors[m]} />)}</datalist>
        </label>
      </div>
    </div>
  );
}

export { majorsLabel } from "@/lib/majorsLabel";
