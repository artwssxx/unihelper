import { describe, expect, it } from "vitest";
import { rng } from "./bank/satMath";
import {
  bank, baseOf, buildReadingTest, buildResult, buildSatModule1, buildSatModule2, getQuestion, gradeIds, ieltsReadingBand,
  isCorrect, module2Path, satPool, satSectionScore, sectionQuestions, toPublic,
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
    const avg = (ids: string[]) => ids.reduce((s, id) => s + getQuestion(id)!.difficulty, 0) / ids.length;
    const hard = buildSatModule2("math", "hard", new Set(m1), new Set(), r);
    const easy = buildSatModule2("math", "easy", new Set(m1), new Set(), r);
    expect(avg(hard)).toBeGreaterThan(avg(easy) + 0.8);
  });

  it("в модуле не больше 3 задач одного навыка (на разных попытках)", () => {
    for (let k = 1; k <= 25; k++) {
    const m1 = buildSatModule1("math", new Set(), rng(k * 5));
    const m2 = buildSatModule2("math", k % 2 ? "easy" : "hard", new Set(m1), new Set(), rng(k * 7));
    for (const ids of [m1, m2]) {
      const cnt: Record<string, number> = {};
      for (const id of ids) cnt[getQuestion(id)!.skill] = (cnt[getQuestion(id)!.skill] ?? 0) + 1;
      expect(Math.max(...Object.values(cnt))).toBeLessThanOrEqual(3);
    }
    }
  });

  it("мини-тесты уроков ссылаются на существующие вопросы", async () => {
    const { LESSONS } = await import("@/lib/content/lessons");
    for (const l of LESSONS) for (const id of l.quiz) expect(bank().has(id), id).toBe(true);
  });

  it("предпочитает невиденные шаблоны (по базе ID)", () => {
    const easyBases = [...new Set(satPool("math", rng(1)).filter((q) => q.difficulty === 1).map((q) => baseOf(q.id)))];
    const seen = new Set(easyBases.slice(0, 4));
    const m1 = buildSatModule1("math", seen, rng(3));
    const picked = new Set(m1.map(baseOf));
    for (const b of easyBases.slice(4)) expect(picked.has(b), b).toBe(true);
  });

  it("каждая попытка — новые вопросы: другие числа в Math и другой порядок/набор в RW", () => {
    for (const section of ["math", "rw"] as const) {
      const a = buildSatModule1(section, new Set(), rng(11));
      const b = buildSatModule1(section, new Set(), rng(12));
      const stems = (ids: string[]) => ids.map((id) => `${getQuestion(id)!.passage ?? ""}|${getQuestion(id)!.stem}|${getQuestion(id)!.choices?.join("/")}`);
      const same = stems(a).filter((x) => stems(b).includes(x)).length;
      expect(same, section).toBeLessThan(a.length * 0.3);
    }
  });

  it("вариант восстанавливается по ID одинаково, а правильный ответ сохраняется при перемешивании", () => {
    const pool = [...satPool("math", rng(21)), ...satPool("rw", rng(22))];
    expect(pool.length).toBeGreaterThan(100);
    for (const q of pool) {
      const again = getQuestion(q.id)!;
      expect(again.stem).toBe(q.stem);
      expect(again.answer).toBe(q.answer);
      if (q.answerType === "mcq") {
        expect(new Set(q.choices).size).toBe(4);
        expect(["A", "B", "C", "D"]).toContain(q.answer);
        const orig = bank().get(baseOf(q.id));
        if (orig?.choices) expect(q.choices![q.answer.charCodeAt(0) - 65]).toBe(orig.choices[orig.answer.charCodeAt(0) - 65]);
      }
    }
  });

  it("чужие и испорченные ID не открываются", () => {
    expect(getQuestion("m-lin~zzzzzzzzzz")).toBeUndefined();
    expect(getQuestion("rw-001~")).toBeUndefined();
    expect(getQuestion("nope~1")).toBeUndefined();
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
      const q = getQuestion(id)!;
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

describe("генерация IELTS Writing", async () => {
  const { pickWritingIds, writingTasks, writingTask1 } = await import("./bank/ieltsWriting");
  it("Task 1 по сиду восстанавливается одинаково, разные сиды — разные данные", () => {
    expect(writingTask1(5)).toEqual(writingTask1(5));
    expect(JSON.stringify(writingTask1(5).chart)).not.toBe(JSON.stringify(writingTask1(6).chart));
  });
  it("Task 2 не повторяет уже виденную тему, пока есть новые", () => {
    const seen = new Set(Array.from({ length: 9 }, (_, i) => `w2-${i}`));
    const ids = pickWritingIds(rng(1), seen);
    expect(ids[1]).toBe("w2-9");
    expect(writingTasks(ids).task2.prompt).toContain("Write at least 250 words");
  });
});
