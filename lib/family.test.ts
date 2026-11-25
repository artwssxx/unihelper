import { describe, expect, it } from "vitest";
import { PROGRAMS } from "../data/programs";
import { childSummary } from "./family";
import type { Profile } from "./types";

const profile: Profile = {
  grade: 11, city: "Ташкент", gpa: 4.6, gpaScale: 5, ielts: 6.5, sat: null, achievementsText: "олимпиада по информатике", bestAchievementLevel: "city",
  activitiesCount: 2, ledSomething: true, targetCountries: ["HU", "KR"], major: "cs", majors: ["cs", "business"], minor: "математика", budgetUsd: 4000, essays: "not_assessed", recommendations: "not_assessed",
};

describe("сводка ребёнка для родителя", () => {
  it("по анкете: сила профиля, план, подходящие вузы, направления", () => {
    const s = childSummary({ linkId: "x", status: "pending", name: "Азиз", data: { profile }, programs: PROGRAMS, now: new Date("2026-11-25") });
    expect(s.strength?.score).toBeGreaterThan(0);
    expect(s.roadmap?.total).toBeGreaterThan(5);
    expect(s.programs.length).toBeGreaterThan(0);
    expect(s.majors).toContain("минор: математика");
    expect(s.grade).toBe("11 класс");
  });
  it("без анкеты — пустая сводка без ошибок; моки — последние сверху, без лишних данных", () => {
    const s = childSummary({
      linkId: "y", status: "active", name: "Мадина", programs: PROGRAMS,
      data: { mocks: [
        { attemptId: "1", exam: "sat", section: "math", mode: "hard", status: "completed", finishedAt: "2026-11-01", scoreLow: 600, scoreHigh: 660 },
        { attemptId: "2", exam: "ielts", section: "reading", mode: "light", status: "completed", finishedAt: "2026-11-10", band: 6.5 },
        { attemptId: "3", exam: "sat", section: "rw", mode: "light", status: "interrupted", finishedAt: "2026-11-12" },
      ] },
    });
    expect(s.strength).toBeNull();
    expect(s.roadmap).toBeNull();
    expect(s.mocks.map((m) => m.label)).toEqual(["IELTS Reading", "SAT Math"]);
    expect(s.mocks[1]).toMatchObject({ result: "≈ 600–660", hard: true });
  });
});
