import { describe, expect, it } from "vitest";
import { loginErrors, marksFromDiary, parseBigJson, parseLoginForm, personFromContext, schoolYear } from "./emaktab";

const FORM = `<html><body><form action="/" method="post" class="login">
<input type="hidden" name="exceededAttempts" value="False"><input type="hidden" name="ReturnUrl" value="">
<input type="hidden" name="FingerprintId" value=""><input type="hidden" name="Captcha.Id" value="ab-12">
<input type="text" name="login"><input type="password" name="password">
<div class="login__body__captcha login__body__captcha_hidden"><img src="/captcha/true/ab-12"></div>
</form></body></html>`;

describe("eMaktab: форма входа и ошибки", () => {
  it("адрес отправки, скрытые поля, капча скрыта", () => {
    const f = parseLoginForm(FORM, "https://login.emaktab.uz/login")!;
    expect(f.action).toBe("https://login.emaktab.uz/");
    expect(f.hidden).toMatchObject({ exceededAttempts: "False", "Captcha.Id": "ab-12" });
    expect(f.captcha).toBe(false);
    expect(f.captchaUrl).toBe("https://login.emaktab.uz/captcha/true/ab-12");
    expect(parseLoginForm(FORM.replace("login__body__captcha_hidden", ""), "https://login.emaktab.uz/")!.captcha).toBe(true);
    expect(parseLoginForm("<html>лента</html>", "https://emaktab.uz/")).toBeNull();
  });
  it("модель ошибок из JSON.parse('…')", () => {
    const wrong = `<script>var m = JSON.parse('{\\x22hasErrors\\x22:true,\\x22firstErrorText\\x22:\\x22login.login.error.emailorpassword\\x22}')</script>`;
    expect(loginErrors(wrong)).toMatchObject({ wrong: true, captcha: false });
    const cap = `<script>JSON.parse('{"hasErrors":true,"isWrongCaptcha":true}')</script>`;
    expect(loginErrors(cap)).toMatchObject({ wrong: false, captcha: true });
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

describe("eMaktab: поле пароля вне <form>", () => {
  it("берём скрытые поля со всей страницы и адрес первой формы", () => {
    const html = `<form action="/login" method="post"><input type="hidden" name="ReturnUrl" value=""></form><div><input type="text" name="login"><input type="password" name="password"></div>`;
    const f = parseLoginForm(html, "https://login.emaktab.uz/")!;
    expect(f.action).toBe("https://login.emaktab.uz/login");
    expect(f.hidden).toEqual({ ReturnUrl: "" });
  });
});
