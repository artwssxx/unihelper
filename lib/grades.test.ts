import { describe, expect, it } from "vitest";
import { aggregateMarks, gradeFromGroup, gradesSummary, parseGradesText, subjectKey } from "./grades";

describe("распознавание предметов", () => {
  it("русский, узбекский (латиница и кириллица), английский", () => {
    expect(subjectKey("Алгебра")).toBe("math");
    expect(subjectKey("Geometriya")).toBe("math");
    expect(subjectKey("Ingliz tili")).toBe("english");
    expect(subjectKey("Инглиз тили")).toBe("english");
    expect(subjectKey("Ona tili va adabiyot")).toBe("native");
    expect(subjectKey("Oʻzbekiston tarixi")).toBe("history");
    expect(subjectKey("Kimyo")).toBe("chemistry");
    expect(subjectKey("Jismoniy tarbiya")).toBe("pe");
    expect(subjectKey("Tarbiya")).toBe("upbringing");
    expect(subjectKey("Chaqiruvgacha boshlangʻich tayyorgarlik")).toBe("military");
    expect(subjectKey("Informatika va axborot texnologiyalari")).toBe("informatics");
    expect(subjectKey("Computer Science")).toBe("informatics");
    expect(subjectKey("Smart-клуб")).toBe("other");
  });
});

describe("разбор вставленной таблицы", () => {
  it("строки с отметками, средним и четвертями; нумерация и десятичная запятая", () => {
    const r = parseGradesText(`Fan\tI chorak\tII chorak
1. Matematika 5 4 5 5
Алгебра — 4,75
Fizika\t4.6\t5
Ingliz tili: 5, 5, 4
10-A sinf`)!;
    expect(r.scale).toBe(5);
    expect(r.items.map((i) => [i.key, i.grade])).toEqual([["math", 4.75], ["math", 4.75], ["physics", 4.8], ["english", 4.67]]);
  });
  it("100-балльная шкала определяется сама; пустой текст — null", () => {
    expect(parseGradesText("Matematika 92\nFizika 88")!.scale).toBe(100);
    expect(parseGradesText("просто текст без оценок")).toBeNull();
  });
});

describe("отметки из дневника и сводка", () => {
  it("средние по предметам, пропуски не считаются", () => {
    const r = aggregateMarks([
      { subject: "Matematika", value: 5 }, { subject: "Matematika", value: "4" }, { subject: "Matematika", value: "н" },
      { subject: "Fizika", value: "5" }, { subject: "Jismoniy tarbiya", value: 3 },
    ]);
    expect(r.scale).toBe(5);
    expect(r.items.find((i) => i.key === "math")).toMatchObject({ grade: 4.5, count: 2 });
    const s = gradesSummary({ items: r.items, scale: r.scale, source: "emaktab", updatedAt: "" }, ["cs"])!;
    expect(s.count).toBe(2); // физкультура не входит в средний
    expect(s.average).toBe(4.75);
    expect(s.core.average100).toBe(95);
  });
  it("класс из названия группы", () => {
    expect(gradeFromGroup("10-A")).toBe(10);
    expect(gradeFromGroup("11 «Б» sinf")).toBe(11);
    expect(gradeFromGroup("2-kurs")).toBe(13);
    expect(gradeFromGroup("5-B")).toBeNull();
  });
});

describe("сокращённые названия предметов из eMaktab", () => {
  it("инф. и ИТ, осн. гос. и права, доприз. подгот., физич.воспит., основы предприн-ва, Час будущего", () => {
    expect(subjectKey("инф. и ИТ")).toBe("informatics");
    expect(subjectKey("осн. гос. и права")).toBe("law");
    expect(subjectKey("доприз. подгот.")).toBe("military");
    expect(subjectKey("физич.воспит.")).toBe("pe");
    expect(subjectKey("основы предприн-ва")).toBe("economics");
    expect(subjectKey("Час будущего")).toBe("upbringing");
    expect(subjectKey("ENGLISH")).toBe("english");
    expect(subjectKey("физика")).toBe("physics");
  });
});
