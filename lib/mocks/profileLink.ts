import type { MockHistoryItem } from "@/lib/clientStore";
import type { Profile } from "@/lib/types";

/** Последние завершённые ХАРД-моки → поля mockSat / mockIelts профиля. */
export function mockScores(history: MockHistoryItem[]): { mockSat: number | null; mockIelts: number | null } {
  const hard = history.filter((h) => h.mode === "hard" && h.status === "completed").sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const math = hard.find((h) => h.section === "math" && h.scoreLow);
  const rw = hard.find((h) => h.section === "rw" && h.scoreLow);
  const reading = hard.find((h) => h.section === "reading" && h.band != null);
  const mid = (h: MockHistoryItem) => Math.round(((h.scoreLow ?? 0) + (h.scoreHigh ?? 0)) / 2 / 10) * 10;
  return {
    mockSat: math && rw ? mid(math) + mid(rw) : null,
    mockIelts: reading?.band ?? null,
  };
}

export function withMocks(p: Profile, history: MockHistoryItem[] = []): Profile {
  return { ...p, ...mockScores(history) };
}
