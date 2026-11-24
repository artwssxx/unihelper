"use client";

import type { MockHistoryItem } from "@/lib/clientStore";

/** Динамика SAT по мокам — столбики как в макете dashboard. Сумма секций, если есть обе. */
export function satTotals(history: MockHistoryItem[]) {
  const done = history
    .filter((h) => h.exam === "sat" && h.status === "completed" && h.scoreLow)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const points: { label: string; low: number; high: number; full: boolean }[] = [];
  let math: MockHistoryItem | null = null, rw: MockHistoryItem | null = null;
  for (const h of done) {
    if (h.section === "math") math = h;
    else rw = h;
    const full = Boolean(math && rw);
    const low = (math?.scoreLow ?? 0) + (rw?.scoreLow ?? 0);
    const high = (math?.scoreHigh ?? 0) + (rw?.scoreHigh ?? 0);
    points.push({ label: new Date(h.finishedAt).toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""), low, high, full });
  }
  return points;
}

export default function MockTrend({ history, compact = false }: { history: MockHistoryItem[]; compact?: boolean }) {
  const pts = satTotals(history).slice(-6);
  if (!pts.length) {
    return <p className="mt-4 text-sm text-muted">Пройдите SAT-мок, чтобы увидеть примерный балл и динамику.</p>;
  }
  const last = pts[pts.length - 1];
  const max = Math.max(...pts.map((p) => p.high), 1);
  const shades = ["#D3E1FB", "#9DBBF5", "#2E6BE6"];
  return (
    <div>
      <div className={`${compact ? "text-[36px]" : "text-[40px]"} mt-3 font-extrabold tracking-tight`}>
        ≈ {last.low}–{last.high}
      </div>
      {!last.full && <p className="text-xs text-muted">Только одна секция — пройдите обе, чтобы увидеть итог 400–1600.</p>}
      <div className="mt-4 flex h-[110px] items-end gap-3.5" role="img" aria-label={`Мок-баллы SAT: ${pts.map((p) => `${p.low}–${p.high}`).join(", ")}`}>
        {pts.map((p, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-[10px]"
              style={{ height: `${Math.max(12, (p.high / max) * 92)}px`, background: i === pts.length - 1 ? shades[2] : shades[Math.min(1, i % 2)] }}
            />
            <span className="text-xs text-muted">{i === pts.length - 1 ? "сейчас" : p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
