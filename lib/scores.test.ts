import { describe, expect, it } from "vitest";
import { cleanIelts, cleanSat, ieltsOverall, parseScoreDate, parseScoreText, ruleAnalysis } from "./scores";

describe("результаты экзаменов", () => {
  it("Overall IELTS по официальному правилу округления", () => {
    expect(ieltsOverall({ listening: 6.5, reading: 6.5, writing: 5, speaking: 7 })).toBe(6.5); // 6.25 → 6.5
    expect(ieltsOverall({ listening: 4, reading: 3.5, writing: 4, speaking: 4 })).toBe(4); // 3.875 → 4
    expect(ieltsOverall({ listening: 6.5, reading: 6.5, writing: 6.5, speaking: 7 })).toBe(6.5); // 6.625 → 6.5
    expect(ieltsOverall({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 })).toBe(7); // 6.75 → 7
    expect(ieltsOverall({ listening: 7 })).toBeNull();
  });

  it("неправдоподобные баллы отбрасываются, сумма SAT считается", () => {
    expect(cleanIelts({ listening: 7.3, reading: 12, writing: 6 })).toEqual({ writing: 6, overall: null });
    expect(cleanSat({ math: 650, rw: 610 })).toEqual({ math: 650, rw: 610, total: 1260 });
    expect(cleanSat({ math: 655, total: 1700 })).toEqual({});
  });

  it("числа из описания", () => {
    expect(parseScoreText("Listening 7.5, Reading 6, Writing 5,5, Speaking 6.5").ielts).toMatchObject({ listening: 7.5, reading: 6, writing: 5.5, speaking: 6.5, overall: 6.5 });
    expect(parseScoreText("сдал IELTS, overall 6.5").ielts.overall).toBe(6.5);
    expect(parseScoreText("Math 650, RW 610").sat).toEqual({ math: 650, rw: 610, total: 1260 });
  });

  it("разбор без ИИ: слабая секция и разрыв до цели", () => {
    const a = ruleAnalysis({ exam: "ielts", ielts: { listening: 7, reading: 6.5, writing: 5.5, speaking: 6.5, overall: 6.5 } }, { ielts: 7 });
    expect(a.weaknesses[0]).toContain("Writing");
    expect(a.targetNote).toContain("0.5");
    const s = ruleAnalysis({ exam: "sat", sat: { math: 600, rw: 680, total: 1280 } }, { sat: 1400 });
    expect(s.weaknesses[0]).toContain("Math");
    expect(s.targetNote).toContain("120");
  });

  it("дата экзамена из отчёта", () => {
    expect(parseScoreDate("Test date: 12/OCT/2026")).toBe("2026-10-12");
    expect(parseScoreDate("Test date: October 4, 2026")).toBe("2026-10-04");
    expect(parseScoreDate("сдавал 05.09.2026")).toBe("2026-09-05");
    expect(parseScoreDate("2026-11-01")).toBe("2026-11-01");
    expect(parseScoreDate("Listening 7.5")).toBeNull();
  });
});

describe("автопроверка сертификата", async () => {
  const { certificateCheck } = await import("./scores");
  const now = new Date("2026-11-25");
  it("официальный свежий IELTS с сходящимися секциями — проверено", () => {
    const r = certificateCheck({ exam: "ielts", kind: "official", date: "2026-10-12", ielts: { listening: 7.5, reading: 7, writing: 6.5, speaking: 7, overall: 7 } }, now);
    expect(r).toEqual({ status: "verified", score: 7, notes: [] });
  });
  it("просроченный, со слов, без даты, несходящийся итог — предупреждения; без балла — отказ", () => {
    expect(certificateCheck({ exam: "ielts", kind: "official", date: "2023-01-10", ielts: { overall: 7 } }, now).notes[0]).toContain("больше 2 лет");
    const self = certificateCheck({ exam: "sat", kind: "self", date: null, sat: { math: 700, rw: 650, total: 1400 } }, now);
    expect(self.status).toBe("warn");
    expect(self.notes.join(" ")).toContain("Сумма секций 1350 не равна итогу 1400");
    expect(self.notes.join(" ")).toContain("со слов");
    expect(certificateCheck({ exam: "sat", kind: "official", date: "2026-05-01", sat: {} }, now).status).toBe("fail");
  });
});
