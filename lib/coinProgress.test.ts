import { describe, expect, it } from "vitest";
import { levelOf } from "./coins";
import { metricsOf, planAwards, type StudentData } from "./coinProgress";
import type { MockHistoryItem } from "./clientStore";

const mock = (o: Partial<MockHistoryItem>): MockHistoryItem => ({ attemptId: Math.random().toString(36), exam: "sat", section: "math", mode: "light", status: "completed", finishedAt: "2026-11-01", ...o });
const plan = (over: Partial<Parameters<typeof planAwards>[0]> & { data?: StudentData } = {}) => {
  const data = over.data ?? {};
  return planAwards({ data, metrics: over.metrics ?? metricsOf(data, 0, 0), base: over.base ?? {}, given: over.given ?? new Set(), todayReasons: over.todayReasons ?? new Set(), stepsToday: over.stepsToday ?? 0, xp: over.xp ?? 0, today: "2026-11-25" });
};

describe("UniCoins: уровни", () => {
  it("уровень по опыту и прогресс до следующего", () => {
    expect(levelOf(0)).toMatchObject({ level: 1, title: "Новичок", to: 50 });
    expect(levelOf(320)).toMatchObject({ level: 4, from: 300, to: 500 });
    expect(levelOf(99999)).toMatchObject({ level: 10, to: null, progress: 1 });
  });
});

describe("UniCoins: монеты за прогресс", () => {
  it("показатели из данных ученика", () => {
    const d: StudentData = { mocks: [mock({ section: "math", scoreLow: 600, scoreHigh: 660 }), mock({ section: "rw", scoreLow: 580, scoreHigh: 620 }), mock({ exam: "ielts", section: "reading", band: 6.5 })], roadmap: { a: "done", b: "doing", c: "done" }, lessons: { x: { watched: true }, y: { watched: false } } };
    expect(metricsOf(d, 4, 1)).toMatchObject({ mocks: 3, bestSat: 1230, bestIelts: 6.5, stepsDone: 2, lessons: 1, streakMax: 4, invites: 1 });
  });
  it("первое значение силы и рекордов — точка отсчёта, дальше монеты только за рост", () => {
    const m = { mocks: 0, bestSat: 1200, bestIelts: 6, strength: 40, streakMax: 0, stepsDone: 0, lessons: 0, invites: 0 };
    const first = plan({ metrics: m });
    expect(first.awards.filter((a) => a.reason === "strength" || a.reason === "pb")).toEqual([]);
    expect(first.base).toEqual({ strengthMax: 40, satBest: 1200, ieltsBest: 6 });
    const grown = plan({ metrics: { ...m, strength: 45, bestSat: 1250, bestIelts: 6.5 }, base: first.base });
    expect(grown.awards).toEqual(expect.arrayContaining([
      { amount: 10, reason: "strength", ref: "max:45" },
      { amount: 25, reason: "pb", ref: "sat:1240" },
      { amount: 25, reason: "pb", ref: "ielts:6.5" },
    ]));
    // падение силы не наказывает и не даёт монет повторно
    expect(plan({ metrics: { ...m, strength: 44 }, base: grown.base }).awards.filter((a) => a.reason === "strength")).toEqual([]);
  });
  it("шаги дорожной карты: только из шаблона, не больше 5 в день, каждый один раз", () => {
    const roadmap = Object.fromEntries([...Array.from({ length: 8 }, (_, i) => [`s${i}`, "done"]), ["c-1", "done"]]);
    const r = plan({ data: { roadmap } });
    expect(r.awards.filter((a) => a.reason === "step").map((a) => a.ref)).toEqual(["s0", "s1", "s2", "s3", "s4"]);
    const later = plan({ data: { roadmap }, given: new Set(["step:s0", "step:s1"]), stepsToday: 4 });
    expect(later.awards.filter((a) => a.reason === "step").map((a) => a.ref)).toEqual(["s2"]);
  });
  it("достижения, бонус за все задания дня и уровни без повторов", () => {
    const m = { mocks: 10, bestSat: null, bestIelts: null, strength: 0, streakMax: 7, stepsDone: 0, lessons: 0, invites: 0 };
    const r = plan({ metrics: m, todayReasons: new Set(["checkin", "lesson", "mock", "step"]) });
    const ids = r.awards.map((a) => `${a.reason}:${a.ref}`);
    expect(ids).toEqual(expect.arrayContaining(["ach:mock_1", "ach:mock_10", "ach:streak_7", "daily:2026-11-25", "level:2"]));
    expect(ids).not.toContain("ach:mock_25");
    expect(ids).not.toContain("level:3"); // 120 опыта + 20 бонуса уровня 2 = 140 < 150
    const again = plan({ metrics: m, given: new Set(ids), xp: r.awards.reduce((s, a) => s + a.amount, 0) });
    expect(again.awards).toEqual([]);
  });
});
