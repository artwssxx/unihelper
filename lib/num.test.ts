import { describe, expect, it } from "vitest";
import { parseDecimal, typingDecimal } from "./num";

describe("ввод чисел с телефона", () => {
  it("запятая и точка, пробелы, пустое", () => {
    expect(parseDecimal("4,2")).toBe(4.2);
    expect(parseDecimal("4.2")).toBe(4.2);
    expect(parseDecimal(" 7 ")).toBe(7);
    expect(parseDecimal("4,")).toBe(4);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1 450")).toBe(1450);
  });
  it("промежуточный ввод не блокируется, мусор — да", () => {
    expect(typingDecimal("4,")).toBe(true);
    expect(typingDecimal("")).toBe(true);
    expect(typingDecimal("4,2,1")).toBe(false);
    expect(typingDecimal("4a")).toBe(false);
  });
});
