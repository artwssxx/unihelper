import Link from "next/link";
import { t } from "@/lib/i18n/ru";
import { LEVEL_NAMES, nextBand } from "@/lib/scoring/strength";
import type { StrengthResult } from "@/lib/types";

const SHORT: Record<string, string> = { academics: "Учёба", tests: "Тесты", activities: "Активности", leadership: "Лидерство", essays: "Эссе" };
const ADVERB = ["начально", "развивается", "сильно", "очень сильно"];

/** Синяя карточка Profile Strength — из макетов landing и dashboard. */
export default function StrengthCard({ s, cta = true, className = "", prev }: { s: StrengthResult; cta?: boolean; className?: string; prev?: { score: number; at: string } | null }) {
  const unknown = s.axes.filter((a) => a.level == null).map((a) => t.axes[a.axis].toLowerCase());
  const next = nextBand(s.score);
  const delta = prev ? s.score - prev.score : 0;
  return (
    <div className={`relative overflow-hidden rounded-[26px] grad-card p-7 text-white ${className}`}>
      <div className="absolute -right-12 -top-12 h-[200px] w-[200px] rounded-full bg-white/[.08]" aria-hidden />
      <span className="inline-block rounded-[10px] bg-white px-3 py-1.5 text-[13px] font-extrabold text-[#111834]">Profile Strength</span>
      <div className="relative mt-5 flex flex-wrap items-center gap-7">
        <div className="flex flex-none flex-col items-center gap-2">
          <div
            className="flex h-[140px] w-[140px] items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#FFD9C4 ${s.score * 3.6}deg, rgba(255,255,255,.2) 0deg)` }}
            role="img"
            aria-label={`Сила профиля ${s.score} из 100, уровень «${LEVEL_NAMES[s.overall]}»`}
          >
            <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-[#2E52D6]/60 text-center backdrop-blur">
              <span className="text-[40px] font-extrabold leading-none tabular-nums">{s.score}</span>
              <span className="mt-0.5 text-[11px] opacity-85">из 100</span>
              <span className="mt-1 px-2 text-[12px] font-extrabold leading-tight first-letter:uppercase">{LEVEL_NAMES[s.overall]}</span>
            </div>
          </div>
          <div className="text-center text-[12px] leading-snug opacity-90">
            {next ? <>до «{next.name}» — {next.left}</> : <>максимальный уровень</>}
            {delta !== 0 && prev && (
              <div className="font-extrabold">{delta > 0 ? `+${delta}` : delta} с {new Date(prev.at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div>
            )}
          </div>
        </div>
        <div className="grid min-w-0 flex-[1_1_240px] gap-[11px]">
          {s.axes.map((a) => (
            <div key={a.axis}>
              <div className="flex justify-between text-[13px] font-semibold">
                <span>{SHORT[a.axis]}</span>
                <span className="opacity-85">{a.points == null ? "не оценено" : `${a.points} · ${ADVERB[a.level ?? 0]}`}</span>
              </div>
              <div className="mt-[5px] h-[7px] rounded-full bg-white/[.22]">
                <div className="h-[7px] rounded-full bg-white transition-[width]" style={{ width: a.points == null ? "4%" : `${Math.max(4, a.points)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {cta && (
        <div className="relative mt-5 flex flex-wrap justify-between gap-3 rounded-[14px] bg-white/[.12] px-4 py-3 text-sm">
          <span>{unknown.length ? `Не оценено: ${unknown.join(", ")}` : "Все оси оценены"}. Это сила профиля, а не шанс поступления.</span>
          <Link href="/profile" className="font-extrabold text-white">Что прокачать →</Link>
        </div>
      )}
    </div>
  );
}
