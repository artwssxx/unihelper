import { describe, expect, it } from "vitest";
import { keyOf, translateText } from "./translate";

const dict = {
  "Подбор вузов": "Universitet tanlash",
  "Шаг # из #": "Step # of #",
  "≈ $#/год без гранта": "≈ $#/year without a grant",
  "Найдено: #": "Found: #",
  "Подать заявку": "Apply",
  "тянет Overall вниз": "pulls Overall down",
  "(следующий набор)": "(next intake)",
  "Собрать документы": "Collect documents",
  "вузы США (Regular Decision)": "US universities (Regular Decision)",
  "Самый важный": "The most important",
  "Попросить рекомендации у учителей": "Ask teachers for recommendations",
  "Узбекистан": "Uzbekistan",
  "Ташкент": "Tashkent",
};

describe("перевод интерфейса по словарю", () => {
  it("точное совпадение с сохранением пробелов по краям", () => {
    expect(translateText(dict, "Подбор вузов")).toBe("Universitet tanlash");
    expect(translateText(dict, "  Подбор   вузов ")).toBe("  Universitet tanlash ");
  });
  it("числа подставляются в шаблон по порядку", () => {
    expect(translateText(dict, "Шаг 3 из 9")).toBe("Step 3 of 9");
    expect(translateText(dict, "≈ $12 000/год без гранта")).toBe("≈ $12 000/year without a grant");
    expect(keyOf("IELTS 6.5 и SAT 1,5").key).toBe("IELTS # и SAT #");
  });
  it("нет в словаре или нет кириллицы — null", () => {
    expect(translateText(dict, "Неизвестная строка")).toBeNull();
    expect(translateText(dict, "IELTS 7.5")).toBeNull();
    expect(translateText(dict, "Найдено: много")).toBeNull();
  });

  it("составные строки переводятся по частям", () => {
    expect(translateText(dict, "Подать заявку: Stipendium Hungaricum")).toBe("Apply: Stipendium Hungaricum");
    expect(translateText(dict, "Writing: 5.5 — тянет Overall вниз")).toBe("Writing: 5.5 — pulls Overall down");
    expect(translateText(dict, "Подать заявку: GKS (следующий набор)")).toBe("Apply: GKS (next intake)");
    expect(translateText(dict, "Совсем: неизвестно")).toBeNull();
  });

  it("вложенные части: скобки внутри частей, кавычки, перечисления через запятую", () => {
    expect(translateText(dict, "Собрать документы: вузы США (Regular Decision)")).toBe("Collect documents: US universities (Regular Decision)");
    expect(translateText(dict, "Самый важный — «Попросить рекомендации у учителей».")).toBe("The most important — «Ask teachers for recommendations».");
    expect(translateText(dict, "Bakalavriat · Узбекистан, Ташкент")).toBe("Bakalavriat · Uzbekistan, Tashkent");
  });
});
