"use client";

import type { MockHistoryItem } from "@/lib/clientStore";
import type { ScoreRecord } from "@/lib/scores";

// Динамика IELTS: официальные результаты (Overall) и моки UniHelper (Reading и Writing) на одной шкале 4–9.

type Pt = { t: number; v: number; label: string };
const SERIES = [
  { id: "official", name: "Официальный / со слов (Overall)", color: "#E8652B" },
  { id: "reading", name: "Мок Reading", color: "#2E6BE6" },
  { id: "writing", name: "Мок Writing", color: "#7B5CF0" },
] as const;

export function ieltsSeries(mocks: MockHistoryItem[], scores: ScoreRecord[]) {
  const mock = (section: "reading" | "writing"): Pt[] =>
    mocks
      .filter((m) => m.exam === "ielts" && m.section === section && m.status === "completed" && typeof m.band === "number")
      .map((m) => ({ t: new Date(m.finishedAt).getTime(), v: m.band as number, label: `мок ${section === "reading" ? "Reading" : "Writing"}` }));
  const official: Pt[] = scores
    .filter((s) => s.exam === "ielts" && typeof s.ielts?.overall === "number")
    .map((s) => ({ t: new Date(s.date).getTime(), v: s.ielts!.overall as number, label: s.kind === "official" ? "официальный" : "со слов" }));
  const sort = (a: Pt[]) => a.sort((x, y) => x.t - y.t).slice(-8);
  return { official: sort(official), reading: sort(mock("reading")), writing: sort(mock("writing")) };
}

export default function IeltsTrend({ mocks, scores }: { mocks: MockHistoryItem[]; scores: ScoreRecord[] }) {
  const s = ieltsSeries(mocks, scores);
  const all = [...s.official, ...s.reading, ...s.writing];
  if (!all.length) return <p className="mt-4 text-sm text-muted">Пройди мок IELTS Reading или Writing или добавь свой результат — здесь появится динамика band.</p>;
  const last = [...s.official].pop() ?? [...s.reading, ...s.writing].sort((a, b) => a.t - b.t).pop()!;
  const t0 = Math.min(...all.map((p) => p.t)), t1 = Math.max(...all.map((p) => p.t));
  const W = 520, H = 170, L = 30, R = 10, T = 10, B = 22;
  const lo = Math.min(4, Math.floor(Math.min(...all.map((p) => p.v)))), hi = 9;
  const x = (t: number) => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return (
    <div>
      <div className="mt-3 text-[40px] font-extrabold tracking-tight">≈ {last.v}</div>
      <p className="text-xs text-muted">последний результат: {last.label}. Моки — примерная оценка, не официальный балл.</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Динамика IELTS: ${all.map((p) => `${p.label} ${p.v}`).join(", ")}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: "var(--line)" }} />
            <text x={L - 8} y={y(v) + 4} fontSize="11" textAnchor="end" style={{ fill: "var(--muted)" }}>{v}</text>
          </g>
        ))}
        {SERIES.map((ser) => {
          const pts = s[ser.id];
          if (!pts.length) return null;
          return (
            <g key={ser.id}>
              {pts.length > 1 && <polyline fill="none" stroke={ser.color} strokeWidth="2.5" strokeLinejoin="round" points={pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")} />}
              {pts.map((p, i) => (
                <circle key={i} cx={x(p.t)} cy={y(p.v)} r={ser.id === "official" ? 5 : 4} fill={ser.color}>
                  <title>{`${p.label}: ${p.v} — ${new Date(p.t).toLocaleDateString("ru-RU")}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        {SERIES.filter((ser) => s[ser.id].length).map((ser) => (
          <span key={ser.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ser.color }} />{ser.name}</span>
        ))}
      </div>
    </div>
  );
}
