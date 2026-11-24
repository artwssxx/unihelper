import { describe, expect, it } from "vitest";
import type { PortfolioState } from "./clientStore";
import { buildSnapshot, normalizePortfolio } from "./portfolio";

const base: PortfolioState = {
  slug: "aziz",
  template: "creative",
  visibility: "draft",
  about: "Люблю физику и делаю роботов.",
  sections: { about: true, projects: true, achievements: true, activities: true, tests: true, contact: true },
  showFields: { phone: false, email: false, city: false, scores: false },
  projects: [{ title: "Робот", text: "Собрал робота" }],
};
const args = {
  name: "Азиз Каримов",
  majorLabel: "Инженерия",
  city: "Ташкент",
  achievementsText: "Призёр олимпиады по физике, Капитан команды",
  activities: ["Летняя школа"],
  tests: "IELTS 6.5",
  contact: { phone: "+998 90 000 00 00", email: "a@example.com" },
  canHideBadge: false,
};

describe("портфолио: публичный снимок", () => {
  it("скрытые контакты, город и баллы не попадают в снимок", () => {
    const s = buildSnapshot({ pf: base, ...args });
    const json = JSON.stringify(s);
    expect(json).not.toContain("+998");
    expect(json).not.toContain("a@example.com");
    expect(json).not.toContain("Ташкент");
    expect(json).not.toContain("IELTS");
  });

  it("включённые поля показываются", () => {
    const s = buildSnapshot({ pf: { ...base, showFields: { phone: true, email: false, city: true, scores: true } }, ...args });
    const json = JSON.stringify(s);
    expect(json).toContain("+998");
    expect(json).not.toContain("a@example.com");
    expect(s.headline).toContain("Ташкент");
    expect(json).toContain("IELTS 6.5");
  });

  it("порядок разделов и свои блоки; небезопасные ссылки отброшены", () => {
    const pf: PortfolioState = {
      ...base,
      order: ["projects", "b-1", "about"],
      blocks: [{ id: "b-1", type: "links", title: "Ссылки", links: [{ label: "ok", url: "https://github.com/x" }, { label: "bad", url: "javascript:alert(1)" }] }],
    };
    const s = buildSnapshot({ pf, ...args });
    expect(s.sections.slice(0, 3).map((x) => x.id)).toEqual(["projects", "b-1", "about"]);
    expect(s.sections[1].links).toEqual([{ label: "ok", url: "https://github.com/x" }]);
  });

  it("скрыть значок можно только в Pro", () => {
    expect(buildSnapshot({ pf: { ...base, hideBadge: true }, ...args }).hideBadge).toBe(false);
    expect(buildSnapshot({ pf: { ...base, hideBadge: true }, ...args, canHideBadge: true }).hideBadge).toBe(true);
  });

  it("normalize добавляет новые разделы в конец и убирает несуществующие", () => {
    const n = normalizePortfolio({ ...base, order: ["ghost", "contact"] });
    expect(n.order[0]).toBe("contact");
    expect(n.order).not.toContain("ghost");
    expect(n.order).toContain("about");
  });
});
