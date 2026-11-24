import { describe, expect, it } from "vitest";
import { PROGRAMS, getProgram } from "../../data/programs";
import type { Profile, Program } from "../types";
import { admissionFit, evaluateProgram, fundingFit } from "./fit";
import { filterPrograms, matchPrograms } from "./match";
import { gpaTo100, scoreProfile } from "./strength";

const base: Profile = {
  grade: 11,
  city: "Ташкент",
  gpa: 4.6,
  gpaScale: 5,
  ielts: 7.0,
  sat: 1400,
  achievementsText: "Республиканская олимпиада по информатике, хакатон, свой сайт для школы",
  bestAchievementLevel: "national",
  activitiesCount: 4,
  ledSomething: true,
  targetCountries: ["US", "HU", "KR"],
  major: "cs",
  budgetUsd: 5000,
  essays: "not_assessed",
  recommendations: "not_assessed",
};

const prog = (over: Partial<Program>): Program => ({ ...getProgram("asu")!, ...over });

describe("scoreProfile", () => {
  it("переводит 5-балльный GPA в 100-балльный", () => {
    expect(gpaTo100(4.5, 5)).toBe(90);
    expect(gpaTo100(null, 5)).toBeNull();
  });

  it("эссе и рекомендации — «не оценено», а не ноль", () => {
    const r = scoreProfile(base);
    const essays = r.axes.find((a) => a.axis === "essays")!;
    expect(essays.level).toBeNull();
    expect(essays.note).toContain("не оценено");
  });

  it("без тестов — начальный уровень по оси тестов и совет про IELTS", () => {
    const r = scoreProfile({ ...base, ielts: null, sat: null, gpa: 4.9 });
    expect(r.axes.find((a) => a.axis === "tests")!.level).toBe(0);
    expect(r.tips.some((t) => t.includes("IELTS"))).toBe(true);
    expect(r.tips).toHaveLength(3);
  });
});

describe("моки в профиле", () => {
  it("хард-мок поднимает ось тестов с пометкой «по моку»", () => {
    const r = scoreProfile({ ...base, ielts: null, sat: null, mockSat: 1460 });
    const t = r.axes.find((a) => a.axis === "tests")!;
    expect(t.level).toBe(3);
    expect(t.note).toContain("по моку");
  });

  it("мок-балл не используется для формальных требований вуза", () => {
    const r = admissionFit({ ...base, sat: null, mockSat: 1550 }, getProgram("harvard")!);
    expect(r.label).toBe("not_eligible");
  });
});

describe("admissionFit", () => {
  it("не выполнен минимальный IELTS → «не соответствует требованиям»", () => {
    const r = admissionFit({ ...base, ielts: 5.0 }, prog({ requirements: { minIelts: 6, minGpa100: null, satRequired: false } }));
    expect(r.label).toBe("not_eligible");
  });

  it("обязательный SAT не сдан → «не соответствует требованиям»", () => {
    const r = admissionFit({ ...base, sat: null }, getProgram("harvard")!);
    expect(r.label).toBe("not_eligible");
  });

  it("полный грант никогда не получает «Высокое соответствие»", () => {
    const strong: Profile = { ...base, gpa: 100, gpaScale: 100, ielts: 9, sat: 1600, essays: "strong", recommendations: "strong" };
    for (const p of PROGRAMS.filter((x) => x.isFullGrant)) {
      expect(admissionFit(strong, { ...p, acceptanceRate: 0.9 }).label).not.toBe("high");
    }
  });

  it("«Высокое соответствие» невозможно, пока эссе не оценены", () => {
    const easy = prog({ acceptanceRate: 0.9, typical: { gpa100: 60, ielts: 5, sat: null } });
    expect(admissionFit({ ...base, gpa: 100, gpaScale: 100 }, easy).label).toBe("realistic");
    const assessed = { ...base, gpa: 100, gpaScale: 100 as const, essays: "strong" as const, recommendations: "strong" as const };
    expect(admissionFit(assessed, easy).label).toBe("high");
  });

  it("«Высокое соответствие» невозможно при acceptance rate ниже 20%", () => {
    const p = prog({ acceptanceRate: 0.18, typical: { gpa100: 60, ielts: 5, sat: null }, weights: { essay: 0, recommendations: 0, interview: 0 } });
    const r = admissionFit({ ...base, gpa: 100, gpaScale: 100, essays: "strong", recommendations: "strong" }, p);
    expect(r.label).not.toBe("high");
  });

  it("acceptance rate < 15% → «Амбициозно» даже для сильного профиля", () => {
    const r = admissionFit({ ...base, gpa: 100, gpaScale: 100, ielts: 8.5, sat: 1580 }, getProgram("mit")!);
    expect(r.label).toBe("ambitious");
  });

  it("каждая метка с причинами и списком неизвестного", () => {
    const r = admissionFit(base, getProgram("nyuad")!);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.unknown).toContain("эссе");
    expect(r.unknown).toContain("интервью");
  });
});

describe("fundingFit", () => {
  it("вуз с высоким acceptance rate без полного финансирования: хороший Admission, низкий Funding", () => {
    const r = evaluateProgram({ ...base, budgetUsd: 3000 }, getProgram("asu")!);
    expect(["realistic", "high"]).toContain(r.admission.label);
    expect(["low", "none"]).toContain(r.funding.label);
  });

  it("need-aware полный грант для иностранцев → низкий Funding Fit", () => {
    const r = fundingFit(base, getProgram("berea")!, "realistic");
    expect(r.label).toBe("low");
  });

  it("полный грант — максимум «Среднее»", () => {
    for (const p of PROGRAMS.filter((x) => x.funding.type === "full")) {
      expect(fundingFit({ ...base, budgetUsd: 0 }, p, "high").label).not.toBe("high");
    }
  });

  it("если семья может оплатить — «Семья может оплатить»", () => {
    expect(fundingFit({ ...base, budgetUsd: 10000 }, getProgram("inha")!, "realistic").label).toBe("self_funded");
  });
});

describe("matchPrograms", () => {
  it("узбекские вузы всегда в списке как запасной вариант", () => {
    const list = filterPrograms({ ...base, targetCountries: ["US"] }, PROGRAMS);
    expect(list.some((p) => p.isLocal)).toBe(true);
  });

  it("находит запасной вариант при реалистичном бюджете", () => {
    const r = matchPrograms(base, PROGRAMS);
    expect(r.hasBackup).toBe(true);
    expect(r.local.some((i) => i.fit.isBackup)).toBe(true);
  });

  it("партнёрство не влияет на порядок и метки", () => {
    const flipped = PROGRAMS.map((p) => ({ ...p, isPartner: !p.isPartner }));
    const a = matchPrograms(base, PROGRAMS);
    const b = matchPrograms(base, flipped);
    expect(b.local.map((i) => i.program.id)).toEqual(a.local.map((i) => i.program.id));
    expect(b.abroad.map((i) => i.fit.admission.label)).toEqual(a.abroad.map((i) => i.fit.admission.label));
  });
});
