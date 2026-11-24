import Link from "next/link";
import { t } from "@/lib/i18n/ru";
import { LEVEL_NAMES } from "@/lib/scoring/strength";
import type { StrengthResult } from "@/lib/types";

const SHORT: Record<string, string> = { academics: "Учёба", tests: "Тесты", activities: "Активности", leadership: "Лидерство", essays: "Эссе" };
const ADVERB = ["начально", "развивается", "сильно", "очень сильно"];

/** Синяя карточка Profile Strength — из макетов landing и dashboard. */
export default function StrengthCard({ s, cta = true, className = "" }: { s: StrengthResult; cta?: boolean; className?: string }) {
  const unknown = s.axes.filter((a) => a.level == null).map((a) => t.axes[a.axis].toLowerCase());
  return (
    <div className={`relative overflow-hidden rounded-[26px] bg-primary p-7 text-white ${className}`}>
      <div className="absolute -right-12 -top-12 h-[200px] w-[200px] rounded-full bg-white/[.08]" aria-hidden />
      <span className="inline-block rounded-[10px] bg-white px-3 py-1.5 text-[13px] font-extrabold text-ink">Profile Strength</span>
      <div className="relative mt-5 flex flex-wrap items-center gap-7">
        <div className="flex h-[132px] w-[132px] flex-none flex-col items-center justify-center rounded-full border-[12px] border-peach text-center">
          <span className={`px-2 font-extrabold leading-tight first-letter:uppercase ${LEVEL_NAMES[s.overall].length > 9 ? "text-[14px]" : "text-[22px]"}`}>{LEVEL_NAMES[s.overall]}</span>
          <span className="text-xs opacity-85">{s.overall + 1} из 4 уровней</span>
        </div>
        <div className="grid min-w-0 flex-[1_1_240px] gap-[11px]">
          {s.axes.map((a) => (
            <div key={a.axis}>
              <div className="flex justify-between text-[13px] font-semibold">
                <span>{SHORT[a.axis]}</span>
                <span className="opacity-85">{a.level == null ? "не оценено" : ADVERB[a.level]}</span>
              </div>
              <div className="mt-[5px] h-[7px] rounded-full bg-white/[.22]">
                <div className="h-[7px] rounded-full bg-white" style={{ width: a.level == null ? "8%" : `${25 + a.level * 25}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {cta && (
        <div className="relative mt-5 flex flex-wrap justify-between gap-3 rounded-[14px] bg-white/[.12] px-4 py-3 text-sm">
          <span>{unknown.length ? `Не оценено: ${unknown.join(", ")}` : "Все оси оценены"}</span>
          <Link href="/profile" className="font-extrabold text-white">Что прокачать →</Link>
        </div>
      )}
    </div>
  );
}
