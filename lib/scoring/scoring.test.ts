import { describe, expect, it } from "vitest";
import { PROGRAMS, getProgram } from "../../data/programs";
import type { Profile, Program } from "../types";
import { admissionFit, evaluateProgram, fundingFit } from "./fit";
import { filterPrograms, matchPrograms } from "./match";
import { subjectKey } from "../grades";
import { gpaTo100, levelOfPoints, nextBand, piecewise, profileGpa100, scoreProfile } from "./strength";

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

describe("сила профиля 1–100", () => {
  it("итог в пределах 1–100 и согласован с уровнем", () => {
    for (const p of [base, { ...base, gpa: 2, ielts: null, sat: null, bestAchievementLevel: "none" as const, activitiesCount: 0, ledSomething: false }]) {
      const r = scoreProfile(p);
      expect(r.score).toBeGreaterThanOrEqual(1);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.overall).toBe(levelOfPoints(r.score));
    }
  });

  it("рост виден плавно: +0.5 IELTS и +1 активность поднимают итог", () => {
    const a = scoreProfile({ ...base, sat: null, ielts: 6.0, activitiesCount: 1 }).score;
    const b = scoreProfile({ ...base, sat: null, ielts: 6.5, activitiesCount: 1 }).score;
    const c = scoreProfile({ ...base, sat: null, ielts: 6.5, activitiesCount: 2 }).score;
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("очки оси совпадают с прежними уровнями на порогах", () => {
    const axis = (p: Partial<Profile>, name: string) => scoreProfile({ ...base, ...p }).axes.find((x) => x.axis === name)!;
    for (const [ielts, lvl] of [[5.0, 0], [5.5, 1], [6.5, 2], [7.5, 3]] as const) {
      const t = axis({ ielts, sat: null }, "tests");
      expect(levelOfPoints(t.points!), String(ielts)).toBe(lvl);
      expect(t.level).toBe(lvl);
    }
  });

  it("неоценённые эссе не тянут итог вниз", () => {
    const none = scoreProfile(base).score;
    const strong = scoreProfile({ ...base, essays: "strong", recommendations: "strong" }).score;
    const weak = scoreProfile({ ...base, essays: "weak", recommendations: "weak" }).score;
    expect(strong).toBeGreaterThan(none);
    expect(weak).toBeLessThan(none);
  });

  it("интерполяция и подсказка до следующего уровня", () => {
    expect(piecewise(6, [4, 5.5, 6.5], [10, 30, 55])).toBeCloseTo(42.5);
    expect(nextBand(60)).toEqual({ name: "очень сильный", left: 15 });
    expect(nextBand(90)).toBeNull();
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

describe("несколько направлений", () => {
  it("программа подходит, если совпадает любое из выбранных направлений", () => {
    const biz = prog({ id: "biz-only", majors: ["business"], country: "HU", isLocal: false });
    const onlyCs = { ...base, major: "cs" as const, majors: undefined, targetCountries: ["HU" as const] };
    const csAndBiz = { ...onlyCs, majors: ["cs" as const, "business" as const] };
    expect(filterPrograms(onlyCs, [biz])).toHaveLength(0);
    expect(filterPrograms(csAndBiz, [biz])).toHaveLength(1);
  });
  it("активности считаются профильными по любому из направлений", () => {
    const p = { ...base, major: "medicine" as const, majors: ["medicine" as const, "cs" as const], achievementsText: "сделал сайт для школы и хакатон" };
    const r = admissionFit(p, prog({ majors: ["cs", "medicine"] }));
    expect(r.reasons.join(" ")).toContain("связаны со специальностью");
  });
});

describe("оценки по предметам", () => {
  const grades = (items: [string, number, boolean?][], scale: 5 | 10 | 100 = 5) => ({
    items: items.map(([subject, grade, special]) => ({ subject, key: subjectKey(subject), grade, ...(special ? { special } : {}) })),
    scale, source: "manual" as const, updatedAt: "2026-11-25",
  });
  const strongCs = grades([["Matematika", 5, true], ["Informatika", 5], ["Fizika", 4.8], ["Ona tili", 4], ["Tarix", 4.2], ["Jismoniy tarbiya", 3]]);

  it("GPA считается по оценкам, физкультура в средний не входит", () => {
    expect(profileGpa100({ ...base, gpa: 3.0, grades: strongCs })).toBeCloseTo(92, 0);
    // меньше трёх предметов — остаётся GPA из анкеты
    expect(profileGpa100({ ...base, grades: grades([["Matematika", 5], ["Fizika", 5]]) })).toBe(92);
    // ученик отключил подсчёт по оценкам
    expect(profileGpa100({ ...base, grades: { ...strongCs, useForGpa: false } })).toBe(92);
  });

  it("сильные профильные предметы и спецпредмет поднимают ось «Учёба», слабые — опускают", () => {
    const pts = (p: Profile) => scoreProfile(p).axes.find((a) => a.axis === "academics")!.points!;
    const same = grades([["Matematika", 4.6], ["Informatika", 4.6], ["Fizika", 4.6], ["Ona tili", 4.6], ["Tarix", 4.6]]);
    const coreStrong = grades([["Matematika", 5, true], ["Informatika", 5], ["Fizika", 5], ["Ona tili", 4.2], ["Tarix", 3.8]]);
    const coreWeak = grades([["Matematika", 3.8], ["Informatika", 4.2], ["Fizika", 4], ["Ona tili", 5], ["Tarix", 6 - 0.4]]);
    expect(pts({ ...base, grades: coreStrong })).toBeGreaterThan(pts({ ...base, grades: same }));
    expect(pts({ ...base, grades: coreWeak })).toBeLessThan(pts({ ...base, grades: same }));
    expect(scoreProfile({ ...base, grades: coreStrong }).axes[0].note).toContain("спецпредметы");
  });

  it("слабый профильный предмет: совет про него и не выше «Реалистично»", () => {
    const weakMath = grades([["Matematika", 3.2], ["Informatika", 5], ["Fizika", 5], ["Ona tili", 5], ["Tarix", 5], ["Ingliz tili", 5]]);
    const p: Profile = { ...base, essays: "strong", recommendations: "strong", grades: weakMath };
    expect(scoreProfile(p).tips.some((t) => t.includes("Математика"))).toBe(true);
    const easy = prog({ acceptanceRate: 0.9, typical: { gpa100: 60, ielts: 5, sat: null } });
    const r = admissionFit(p, easy);
    expect(r.label).toBe("realistic");
    expect(r.reasons.join(" ")).toContain("слабая оценка по профильному предмету: математика");
    // без слабого предмета тот же профиль — «Высокое соответствие»
    expect(admissionFit({ ...p, grades: strongCs }, easy).label).toBe("high");
    expect(admissionFit({ ...p, grades: strongCs }, easy).reasons.join(" ")).toContain("сильные оценки по профильным предметам");
  });

  it("профильные предметы зависят от направления: для медицины важны биология и химия", () => {
    const g = grades([["Matematika", 3.4], ["Biologiya", 5], ["Kimyo", 5], ["Ona tili", 4.5]]);
    const med = admissionFit({ ...base, major: "medicine", majors: ["medicine"], grades: g }, prog({ majors: "any" }));
    expect(med.reasons.join(" ")).not.toContain("слабая оценка");
    const cs = admissionFit({ ...base, grades: g }, prog({ majors: "any" }));
    expect(cs.reasons.join(" ")).toContain("математика");
  });
});
