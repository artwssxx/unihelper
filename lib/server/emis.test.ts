import { describe, expect, it } from "vitest";
import { gradesFromEmis, semesterGrade } from "./emis";

// Структура как у ответа EMIS ratings/ (без личных данных): массив семестров, в каждом — предметы.
const subj = (uz: string, en: string, type = "Umumta'lim fanlar") => ({ name: { uz, ru: "", en }, edu_subject_type: { name: type } });
const SEM1 = [
  { edu_subject: subj("Algebra", "Algebra", "Chuqurlashtirilgan fanlar"), rating: 3, current_rating: 5, midterm_exam_rating: 5 },
  { edu_subject: subj("Fizika", "Physics", "Chuqurlashtirilgan fanlar"), rating: 2, current_rating: 4, midterm_exam_rating: 3 },
  { edu_subject: subj("O‘zbek (rus) tili", "Uzbek (Russian) language"), rating: 2, current_rating: 4, midterm_exam_rating: 3 },
  { edu_subject: subj("1 - Xorijiy til: ingliz tili", "1 - Foreign language: English"), rating: 3, current_rating: 4, midterm_exam_rating: 5 },
  { edu_subject: subj("Kimyo", "Chemistry") },
  { edu_subject: subj("Texnik-dasturchi", "Technician programmer", "Kasbiy fanlar"), current_rating: 5 },
];
const SEM_EMPTY = [{ edu_subject: subj("Algebra", "Algebra", "Chuqurlashtirilgan fanlar") }];

describe("EMIS: оценки лицеиста", () => {
  it("до итогового контроля — среднее текущего и промежуточного; после — рейтинг семестра", () => {
    expect(semesterGrade({ rating: 3, current_rating: 5, midterm_exam_rating: 5 })).toBe(5);
    expect(semesterGrade({ rating: 4, current_rating: 5, midterm_exam_rating: 4, final_exam_rating: 4 })).toBe(4);
    expect(semesterGrade({})).toBeNull();
  });
  it("предметы, спецпредметы (углублённые), пустые предметы и семестры пропускаются", () => {
    const r = gradesFromEmis([SEM1, SEM_EMPTY, SEM_EMPTY, SEM_EMPTY], "uz");
    expect(r.semesters).toBe(1);
    expect(r.items.map((i) => [i.subject, i.key, i.grade, Boolean(i.special)])).toEqual([
      ["Algebra", "math", 5, true],
      ["Fizika", "physics", 3.5, true],
      ["O‘zbek (rus) tili", "native", 3.5, false],
      ["Xorijiy til: ingliz tili", "english", 4.5, false],
      ["Texnik-dasturchi", "informatics", 5, false],
    ]);
  });
  it("несколько семестров — среднее по семестрам; язык названий — как у ученика (пустой — узбекский)", () => {
    const sem2 = [{ edu_subject: subj("Algebra", "Algebra", "Chuqurlashtirilgan fanlar"), rating: 4, current_rating: 4, midterm_exam_rating: 4, final_exam_rating: 4 }];
    const r = gradesFromEmis([SEM1, sem2], "en");
    expect(r.semesters).toBe(2);
    expect(r.items.find((i) => i.key === "math")).toMatchObject({ subject: "Algebra", grade: 4.5, count: 2 });
    expect(gradesFromEmis([SEM1], "ru").items[0].subject).toBe("Algebra");
  });
});

describe("EMIS: дневник", async () => {
  const { daysFromSchedules, partsFromSubjectRatings, isoFromDmy } = await import("./emis");
  it("даты EMIS", () => {
    expect(isoFromDmy("25.11.2026")).toBe("2026-11-25");
    expect(isoFromDmy("2026-11-25")).toBeNull();
  });
  it("расписание: время по номеру пары, тема, вид занятия, файл домашки, отметка; имена учителей не берём", () => {
    const days = daysFromSchedules(
      [
        { date: "24.11.2026", classes: [{ pair_number: 1, teachers: [{ edu_subject: subj("Fizika", "Physics"), class_type: { name: "Laboratoriya" }, room: { name: "204" }, topic: { name: "Optika ", homework_file_url: "https://cdn-emis.edu.uz/files/h.pdf" }, rating: 5, teacher: { citizen: { first_name: "X" } } }] }] },
        { date: "28.11.2026", classes: null },
      ],
      [{ pair_number: 1, begin_time: "10:10", end_time: "11:30" }],
      "uz",
    );
    expect(days).toEqual([
      { date: "2026-11-24", lessons: [{ n: 2, start: "10:10", end: "11:30", subject: "Fizika", room: "204", kind: "Laboratoriya", topic: "Optika", homework: null, homeworkUrl: "https://cdn-emis.edu.uz/files/h.pdf", marks: [5], absent: false }] },
      { date: "2026-11-28", lessons: [] },
    ]);
    expect(JSON.stringify(days)).not.toContain("first_name");
  });
  it("разбивка по видам контроля с отметками по датам", () => {
    const r = partsFromSubjectRatings({ result: { ratings: [
      { name: "Joriy nazorat", dailyRatings: [{ rating: 4, class_date: "03.09.2026" }, { rating: 5, class_date: "10.09.2026" }] },
      { name: "Oraliq nazorat", dailyRatings: [{ rating: 3, class_date: "09.10.2026" }] },
      { name: "Yakuniy nazorat", dailyRatings: [] },
    ], semester_rating: 2 } });
    expect(r.semesterRating).toBe(2);
    expect(r.parts.map((p) => [p.name, p.avg, p.marks.length])).toEqual([["Joriy nazorat", 4.5, 2], ["Oraliq nazorat", 3, 1]]);
  });
});
