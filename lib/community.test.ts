import { describe, expect, it } from "vitest";
import { cleanList, directKey, gradeLabel, looksLikeContact, slugifyOrg } from "./community";

describe("комьюнити", () => {
  it("ключ личного чата не зависит от порядка участников", () => {
    expect(directKey("b", "a")).toBe(directKey("a", "b"));
  });

  it("адрес организации: транслит и только допустимые символы", () => {
    expect(slugifyOrg("Клуб робототехники")).toBe("klub-robototehniki");
    expect(slugifyOrg("MUN Tashkent 2026!")).toBe("mun-tashkent-2026");
    expect(slugifyOrg("Я")).toMatch(/^[a-z0-9][a-z0-9-]{2,40}$/);
  });

  it("списки навыков без дублей и мусора", () => {
    expect(cleanList(["Python", " python ", "x", "Figma", ""], 5)).toEqual(["Python", "Figma"]);
    expect(cleanList(Array.from({ length: 20 }, (_, i) => `skill ${i}`), 3)).toHaveLength(3);
  });

  it("предупреждает про телефон, почту, Telegram и адрес", () => {
    expect(looksLikeContact("мой номер +998 90 123 45 67")).toBe(true);
    expect(looksLikeContact("пиши на test@mail.uz")).toBe(true);
    expect(looksLikeContact("мой тг @aziz_karimov")).toBe(true);
    expect(looksLikeContact("живу на улице Навои, дом 5")).toBe(true);
    expect(looksLikeContact("давай созвонимся в 19:00 и обсудим проект")).toBe(false);
  });

  it("класс и курс", () => {
    expect(gradeLabel(10)).toBe("10 класс");
    expect(gradeLabel(13)).toBe("2 курс");
    expect(gradeLabel(null)).toBeNull();
  });
});
