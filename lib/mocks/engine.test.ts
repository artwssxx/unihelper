import { describe, expect, it } from "vitest";
import { rng } from "./bank/satMath";
import {
  bank, buildReadingTest, buildResult, buildSatModule1, buildSatModule2, gradeIds, ieltsReadingBand,
  isCorrect, module2Path, satSectionScore, sectionQuestions, toPublic,
} from "./engine";

const LETTERS = "ABCDEFGH";

describe("банк вопросов", () => {
  it("у каждого MCQ ровно один ответ, буква в пределах вариантов, варианты различаются", () => {
    for (const q of bank().values()) {
      if (q.answerType !== "mcq") continue;
      expect(q.choices, q.id).toBeDefined();
      expect(LETTERS.indexOf(q.answer), q.id).toBeGreaterThanOrEqual(0);
      expect(LETTERS.indexOf(q.answer), q.id).toBeLessThan(q.choices!.length);
      expect(new Set(q.choices).size, q.id).toBe(q.choices!.length);
    }
  });

  it("SPR-ответы — числа", () => {
    for (const q of bank().values()) if (q.answerType === "spr") expect(Number.isFinite(Number(q.answer)), q.id).toBe(true);
  });

  it("id и условия уникальны", () => {
    const qs = [...bank().values()];
    expect(new Set(qs.map((q) => q.stem + (q.passage ?? "") + q.id)).size).toBe(qs.length);
    const math = qs.filter((q) => q.section === "math");
    expect(new Set(math.map((q) => q.stem)).size).toBe(math.length);
  });

  it("банков хватает на полный адаптивный мок", () => {
    const math = sectionQuestions("math");
    expect(math.length).toBeGreaterThanOrEqual(200);
    for (const d of [1, 2, 3]) expect(math.filter((q) => q.difficulty === d).length).toBeGreaterThanOrEqual(40);
    expect(sectionQuestions("rw").length).toBeGreaterThanOrEqual(54);
    expect(buildReadingTest()).toHaveLength(40);
  });

  it("публичная версия вопроса не раскрывает ответ и разбор", () => {
    const q = [...bank().values()][0];
    const pub = toPublic(q) as Record<string, unknown>;
    expect(pub.answer).toBeUndefined();
    expect(pub.explanation).toBeUndefined();
    expect(pub.accept).toBeUndefined();
    expect(pub.hint).toBeUndefined();
  });
});

describe("адаптивные модули SAT", () => {
  for (const section of ["math", "rw"] as const) {
    it(`${section}: модуль 1 и оба варианта модуля 2 — нужной длины, без повторов`, () => {
      const r = rng(42);
      const n = section === "math" ? 22 : 27;
      const m1 = buildSatModule1(section, new Set(), r);
      expect(m1).toHaveLength(n);
      expect(new Set(m1).size).toBe(n);
      for (const path of ["easy", "hard"] as const) {
        const m2 = buildSatModule2(section, path, new Set(m1), new Set(), r);
        expect(m2).toHaveLength(n);
        expect(m2.some((id) => m1.includes(id))).toBe(false);
      }
    });
  }

  it("сложная ветка модуля 2 сложнее лёгкой", () => {
    const r = rng(7);
    const m1 = buildSatModule1("math", new Set(), r);
    const avg = (ids: string[]) => ids.reduce((s, id) => s + bank().get(id)!.difficulty, 0) / ids.length;
    const hard = buildSatModule2("math", "hard", new Set(m1), new Set(), r);
    const easy = buildSatModule2("math", "easy", new Set(m1), new Set(), r);
    expect(avg(hard)).toBeGreaterThan(avg(easy) + 0.8);
  });

  it("в модуле не больше 3 задач одного навыка", () => {
    const m1 = buildSatModule1("math", new Set(), rng(5));
    const m2 = buildSatModule2("math", "easy", new Set(m1), new Set(), rng(6));
    for (const ids of [m1, m2]) {
      const cnt: Record<string, number> = {};
      for (const id of ids) cnt[bank().get(id)!.skill] = (cnt[bank().get(id)!.skill] ?? 0) + 1;
      expect(Math.max(...Object.values(cnt))).toBeLessThanOrEqual(3);
    }
  });

  it("мини-тесты уроков ссылаются на существующие вопросы", async () => {
    const { LESSONS } = await import("@/lib/content/lessons");
    for (const l of LESSONS) for (const id of l.quiz) expect(bank().has(id), id).toBe(true);
  });

  it("предпочитает невиденные вопросы", () => {
    const pool = sectionQuestions("math").filter((q) => q.difficulty === 1);
    const seen = new Set(pool.slice(0, 40).map((q) => q.id));
    const m1 = buildSatModule1("math", seen, rng(3));
    const easyPicked = m1.filter((id) => bank().get(id)!.difficulty === 1);
    expect(easyPicked.every((id) => !seen.has(id))).toBe(true);
  });

  it("порог ветки: хорошо решённый модуль 1 → сложная ветка", () => {
    expect(module2Path(0.8)).toBe("hard");
    expect(module2Path(0.3)).toBe("easy");
  });
});

describe("проверка ответов и балл", () => {
  it("SPR принимает эквивалентные записи числа", () => {
    const q = [...bank().values()].find((x) => x.answerType === "spr")!;
    expect(isCorrect(q, q.answer)).toBe(true);
    expect(isCorrect(q, ` ${q.answer}.0 `)).toBe(true);
    expect(isCorrect(q, String(Number(q.answer) + 1))).toBe(false);
  });

  it("IELTS text-ответ не зависит от регистра и артикля, принимает варианты", () => {
    const q = bank().get("r10")!;
    expect(isCorrect(q, "Fishing Boats")).toBe(true);
    expect(isCorrect(q, "boats")).toBe(true);
    expect(isCorrect(q, "ships")).toBe(false);
  });

  it("все верные → потолок ветки; лёгкая ветка не выше сложной", () => {
    const top = satSectionScore(1, "hard");
    expect(top.high).toBeLessThanOrEqual(800);
    expect(top.high).toBeGreaterThanOrEqual(780);
    expect(satSectionScore(1, "easy").high).toBeLessThan(top.low);
    expect(satSectionScore(0, "easy").low).toBe(200);
  });

  it("балл монотонно растёт с долей верных", () => {
    let prev = 0;
    for (let f = 0; f <= 1.0001; f += 0.1) {
      const s = satSectionScore(f, "hard");
      expect(s.low).toBeGreaterThanOrEqual(prev);
      prev = s.low;
    }
  });

  it("IELTS Reading: пересчёт в band", () => {
    expect(ieltsReadingBand(40)).toBe(9);
    expect(ieltsReadingBand(30)).toBe(7);
    expect(ieltsReadingBand(23)).toBe(6);
    expect(ieltsReadingBand(0)).toBe(0);
  });

  it("результат мока: диапазон, слабые домены, разбор", () => {
    const r = rng(11);
    const m1 = buildSatModule1("math", new Set(), r);
    // верно отвечаем только на Algebra
    const ans = (ids: string[]) => Object.fromEntries(ids.map((id) => {
      const q = bank().get(id)!;
      return [id, q.domain === "Algebra" ? q.answer : "Z"];
    }));
    const a1 = ans(m1);
    const path = module2Path(gradeIds(m1, a1).fraction);
    const m2 = buildSatModule2("math", path, new Set(m1), new Set(), r);
    const res = buildResult({
      attemptId: "t", exam: "sat", section: "math", mode: "light", path,
      modules: [{ module: 1, qids: m1, answers: a1, times: {} }, { module: 2, qids: m2, answers: ans(m2), times: {} }],
    });
    expect(res.scoreLow!).toBeLessThan(res.scoreHigh!);
    expect(res.review).toHaveLength(44);
    expect(res.weakDomains).not.toContain("Algebra");
    expect(res.weakDomains.length).toBeGreaterThan(0);
    expect(res.tips).toHaveLength(3);
  });
});
