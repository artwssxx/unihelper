import { describe, expect, it } from "vitest";
import { buildRoadmap, cycleStartYear, effectiveStatus } from "./roadmap";
import type { Profile } from "./types";

const p: Profile = {
  grade: 11, city: "Ташкент", gpa: 4.5, gpaScale: 5, ielts: null, sat: null, achievementsText: "",
  bestAchievementLevel: "school", activitiesCount: 1, ledSomething: false, targetCountries: ["US", "HU"],
  major: "cs", budgetUsd: 3000, essays: "not_assessed", recommendations: "not_assessed",
};
const now = new Date("2026-11-24T10:00:00");

describe("buildRoadmap", () => {
  it("сезон подачи считается от класса", () => {
    expect(cycleStartYear(11, now)).toBe(2026);
    expect(cycleStartYear(9, now)).toBe(2028);
  });

  it("есть заявки по каждой цели, включая запасной вариант в Узбекистане", () => {
    const r = buildRoadmap(p, [], now);
    expect(r.some((i) => i.id === "apply-US")).toBe(true);
    expect(r.some((i) => i.id === "apply-HU")).toBe(true);
    expect(r.some((i) => i.id === "apply-UZ")).toBe(true);
  });

  it("сроки заявок помечены «ориентировочно», шаги ведут в разделы", () => {
    const r = buildRoadmap(p, [], now);
    expect(r.filter((i) => i.track === "applications").every((i) => i.estimated)).toBe(true);
    expect(r.find((i) => i.id === "sat-mock")?.link).toBe("/mocks");
  });

  it("без SAT-целей нет SAT-шагов; со слабыми активностями есть шаг про ивенты", () => {
    const r = buildRoadmap({ ...p, targetCountries: ["HU"] }, [], now);
    expect(r.some((i) => i.id.startsWith("sat-"))).toBe(false);
    expect(r.some((i) => i.link === "/events")).toBe(true);
  });

  it("расчётные шаги не попадают в прошлое; прошедший набор переносится на следующий", () => {
    const r = buildRoadmap({ ...p, targetCountries: ["KR"] }, [], now);
    expect(r.every((i) => i.due >= "2026-11-01")).toBe(true);
    expect(r.find((i) => i.id === "apply-KR")!.title).toContain("следующий набор");
  });

  it("прошедший невыполненный шаг — просрочен", () => {
    const item = { id: "x", title: "x", track: "tests" as const, due: "2026-09-01", estimated: false, source: "auto" as const };
    expect(effectiveStatus(item, undefined, now)).toBe("overdue");
    expect(effectiveStatus(item, "done", now)).toBe("done");
  });
});
