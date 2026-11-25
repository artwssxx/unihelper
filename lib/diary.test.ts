import { describe, expect, it } from "vitest";
import { PROGRAMS } from "../data/programs";
import { dayLessons, diaryInsights, gpaLabel, upcomingHomework, type Diary, type DiaryLesson } from "./diary";
import { subjectKey } from "./grades";
import type { Profile } from "./types";

const L = (subject: string, over: Partial<DiaryLesson> = {}): DiaryLesson => ({ n: 1, start: "08:30", end: "09:50", subject, room: "204", kind: null, topic: null, homework: null, homeworkUrl: null, marks: [], absent: false, ...over });
const diary: Pick<Diary, "days" | "subjects" | "absences"> = {
  days: [
    { date: "2026-11-23", lessons: [L("Algebra", { homework: "№ 12–15" }), L("Fizika")] }, // понедельник
    { date: "2026-11-25", lessons: [L("Ingliz tili", { homeworkUrl: "https://cdn-emis.edu.uz/files/x.pdf" })] },
  ],
  subjects: [
    { subject: "Fizika", key: "physics", grade: 3.8, parts: [{ name: "Joriy nazorat", avg: 4.5, marks: [] }, { name: "Oraliq nazorat", avg: 3, marks: [] }] },
  ],
  absences: { total: 3, items: [{ date: "2026-11-10", subject: "Informatika" }, { date: "2026-11-10", subject: "Huquq" }, { date: "2026-11-25", subject: "Informatika" }] },
};

describe("дневник", () => {
  it("оценка GPA: те же пороги, что у силы профиля", () => {
    expect(gpaLabel(96).label).toBe("отлично");
    expect(gpaLabel(90).label).toBe("хорошо");
    expect(gpaLabel(80).label).toBe("приемлемо");
    expect(gpaLabel(70).label).toBe("слабо");
    expect(gpaLabel(50).label).toBe("плохо");
  });
  it("расписание: точный день из снимка, иначе обычное расписание этого дня недели без домашки; воскресенье пустое", () => {
    expect(dayLessons(diary, "2026-11-23")).toMatchObject({ projected: false });
    const next = dayLessons(diary, "2026-11-30"); // следующий понедельник
    expect(next.projected).toBe(true);
    expect(next.lessons.map((l) => [l.subject, l.homework])).toEqual([["Algebra", null], ["Fizika", null]]);
    expect(dayLessons(diary, "2026-11-29").lessons).toEqual([]);
  });
  it("домашние задания с сегодняшнего дня", () => {
    expect(upcomingHomework(diary, "2026-11-25").map((h) => h.subject)).toEqual(["Ingliz tili"]);
    expect(upcomingHomework(diary, "2026-11-20").map((h) => h.subject)).toEqual(["Algebra", "Ingliz tili"]);
  });
  it("разбор: GPA, что даст рост слабого профильного предмета, что ухудшит, контрольные и пропуски", () => {
    const items = [["Matematika", 3.6], ["Informatika", 5], ["Fizika", 4.8], ["Ona tili", 4.5], ["Tarix", 4.4]].map(([s, g]) => ({ subject: s as string, key: subjectKey(s as string), grade: g as number }));
    const p: Profile = {
      grade: 10, city: "Ташкент", gpa: null, gpaScale: 5, ielts: 6.5, sat: null, achievementsText: "", bestAchievementLevel: "city", activitiesCount: 2, ledSomething: false,
      targetCountries: ["KR", "HU"], major: "cs", budgetUsd: 4000, essays: "not_assessed", recommendations: "not_assessed",
      grades: { items, scale: 5, source: "emis", updatedAt: "" },
    };
    const ins = diaryInsights(p, PROGRAMS, diary);
    expect(ins[0].title).toMatch(/^GPA 4\.46 из 5 — хорошо$/);
    expect(ins.find((i) => i.title.startsWith("Что даст рост"))!.title).toContain("Matematika 3.6 → 4.1");
    expect(ins.find((i) => i.title.startsWith("Что даст рост"))!.text.join(" ")).toMatch(/Сила профиля \+\d+/);
    expect(ins.some((i) => i.title.startsWith("Что ухудшит: Informatika"))).toBe(true);
    expect(ins.find((i) => i.title === "Контрольные ниже текущих оценок")!.text.join(" ")).toContain("Fizika: текущие 4.5, контрольная 3");
    expect(ins.find((i) => i.title === "Пропусков: 3")!.text.join(" ")).toContain("Informatika (2)");
  });
});
