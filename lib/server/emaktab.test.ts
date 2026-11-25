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
    expect(personFromContext(raw)).toEqual({ personId: "1000012345678901234", schoolId: "1000006039552", groupName: "10-A" });
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
