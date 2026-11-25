import { describe, expect, it } from "vitest";
import { captchaPart, exceededInput, loginErrors, marksFromDiary, parseBigJson, personFromContext, schoolYear } from "./emaktab";

describe("eMaktab: форма входа и ошибки", () => {
  it("капча: нужна ли (exceededAttempts) и откуда брать картинку (imagePart)", () => {
    expect(exceededInput(`<input type="hidden" name="exceededAttempts" value="False">`)).toBe(false);
    expect(exceededInput(`<input value="True" type="hidden" name="exceededAttempts">`)).toBe(true);
    expect(captchaPart(`JSON.parse('{\\x22imagePart\\x22:\\x22https://login.emaktab.uz/captcha/true/\\x22}')`)).toBe("https://login.emaktab.uz/captcha/true/");
    expect(captchaPart("<html></html>")).toBe("https://login.emaktab.uz/captcha/true/");
    // чужой адрес не берём
    expect(captchaPart(`"imagePart":"https://evil.example/captcha/"`)).toBe("https://login.emaktab.uz/captcha/true/");
  });
  it("модель ошибок из JSON.parse('…')", () => {
    const wrong = `<script>var m = JSON.parse('{\\x22hasErrors\\x22:true,\\x22firstErrorText\\x22:\\x22login.login.error.emailorpassword\\x22}')</script>`;
    expect(loginErrors(wrong)).toMatchObject({ wrong: true, captcha: false });
    const cap = `<script>JSON.parse('{"hasErrors":true,"isWrongCaptcha":true}')</script>`;
    expect(loginErrors(cap)).toMatchObject({ wrong: false, captcha: true, wrongCaptcha: true });
    expect(loginErrors(`JSON.parse('{"hasErrors":true,"exceededAttempts":true}')`)).toMatchObject({ wrong: false, captcha: true, wrongCaptcha: false });
    expect(loginErrors("<html>ok</html>")).toMatchObject({ wrong: false, captcha: false });
  });
});

describe("eMaktab: данные ученика и дневник", () => {
  it("19-значные ID не теряют точность, контекст ученика и класс", () => {
    const raw = parseBigJson(`{"contextPersons":[{"personId":1000012345678901234,"schoolId":1000006039552,"eduGroups":[{"id":2524942980748797372,"name":"10-A"}]}]}`);
    expect(personFromContext(raw)).toEqual({ personId: "1000012345678901234", schoolId: "1000006039552", groupName: "10-A", schoolName: null });
  });
  it("отметки из дневника: предмет урока и workMarks", () => {
    const diary = { days: [
      { lessons: [
        { subject: { name: "Matematika" }, workMarks: [{ marks: [{ value: "5" }, { value: "4" }] }] },
        { subject: "Fizika", marks: [{ value: 5 }] },
        { subject: { name: "Tarix" }, workMarks: [] },
      ] },
    ] };
    expect(marksFromDiary(diary)).toEqual([
      { subject: "Matematika", value: "5" }, { subject: "Matematika", value: "4" }, { subject: "Fizika", value: 5 },
    ]);
  });
  it("учебный год с 1 сентября, до 15 сентября — прошлый", () => {
    expect(schoolYear(new Date("2026-11-25")).year).toBe(2026);
    expect(schoolYear(new Date("2026-09-05")).year).toBe(2025);
    expect(schoolYear(new Date("2027-03-01")).year).toBe(2026);
  });
});

describe("eMaktab: дневник", async () => {
  const { daysFromEmaktab, subjectsFromMarks, dayIso } = await import("./emaktab");
  it("даты дней: секунды, миллисекунды и строка → день по Ташкенту", () => {
    expect(dayIso(Date.UTC(2026, 10, 24, 19, 30) / 1000)).toBe("2026-11-25"); // 00:30 по Ташкенту
    expect(dayIso(Date.UTC(2026, 10, 24, 10))).toBe("2026-11-24");
    expect(dayIso("2026-11-24T00:00:00")).toBe("2026-11-24");
  });
  it("уроки: время, кабинет, тема, домашка, отметки, пропуск «Н»; отменённые и учителя не попадают", () => {
    const r = daysFromEmaktab([{ days: [{ date: "2026-11-24", lessons: [
      { number: 2, subject: { name: "Fizika" }, hours: { startHour: 9, startMinute: "05", endHour: 9, endMinute: 50 }, place: "21", theme: "Optika", homework: { text: " §12, 3-mashq " }, workMarks: [{ marks: [{ value: "5" }] }], teacher: { firstName: "X" } },
      { number: 1, subject: "Matematika", workMarks: [{ marks: [{ value: "Н" }] }] },
      { number: 3, subject: "Tarix", isCanceled: true },
    ] }] }]);
    expect(r.days[0].lessons.map((l) => [l.n, l.subject, l.start, l.end, l.room, l.topic, l.homework, l.marks, l.absent])).toEqual([
      [1, "Matematika", null, null, null, null, null, [], true],
      [2, "Fizika", "09:05", "09:50", "21", "Optika", "§12, 3-mashq", [5], false],
    ]);
    expect(r.marks).toEqual([{ subject: "Fizika", date: "2026-11-24", value: 5 }]);
    expect(r.absences).toEqual([{ date: "2026-11-24", subject: "Matematika" }]);
    expect(JSON.stringify(r)).not.toContain("firstName");
  });
  it("отметки предмета по четвертям", () => {
    const s = subjectsFromMarks(
      [{ subject: "Fizika", date: "2026-09-10", value: 4 }, { subject: "Fizika", date: "2026-10-01", value: 5 }, { subject: "Fizika", date: "2026-11-24", value: 5 }],
      [{ subject: "Fizika", key: "physics", grade: 4.67 }],
    );
    expect(s[0].parts.map((p) => [p.name, p.avg, p.marks.length])).toEqual([["1 четверть", 4.5, 2], ["2 четверть", 5, 1]]);
  });
});
