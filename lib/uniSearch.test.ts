import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/contentStore", async () => {
  const { PROGRAMS } = await import("@/data/programs");
  return { getContent: async () => PROGRAMS };
});

describe("поиск вузов для автодополнения", async () => {
  const { searchUniversities } = await import("./server/uniDirectory");

  it("находит вуз из справочника по части названия", async () => {
    const r = await searchUniversities("seoul national");
    expect(r.some((h) => /Seoul National University/i.test(h.name) && h.country === "KR")).toBe(true);
  });

  it("вуз из каталога Unihelper идёт первым и с id программы", async () => {
    const r = await searchUniversities("inha");
    expect(r[0].programId).toBe("inha");
  });

  it("фильтр по стране и короткий запрос", async () => {
    const r = await searchUniversities("university", "UZ");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((h) => h.country === "UZ")).toBe(true);
    expect(await searchUniversities("a")).toEqual([]);
  });
});
