import { describe, expect, it } from "vitest";
import { isUntracked, sanitizePath } from "./analytics";

describe("аналитика: адреса без личных данных", () => {
  it("убирает query и заменяет динамические части пути", () => {
    expect(sanitizePath("/p/aziz-karimov?k=secret")).toBe("/p/[slug]");
    expect(sanitizePath("/community/chats?c=65c0e2ae-b1b2-4d37-8f89-6731597e7e6c")).toBe("/community/chats");
    expect(sanitizePath("/community/org/65c0e2ae-b1b2-4d37-8f89-6731597e7e6c")).toBe("/community/org/[id]");
    expect(sanitizePath("/mocks/result/abc123")).toBe("/mocks/result/[id]");
    expect(sanitizePath("/blog/digital-sat-explained")).toBe("/blog/digital-sat-explained");
  });
  it("админку не отслеживаем", () => {
    expect(isUntracked("/admin/leads")).toBe(true);
    expect(isUntracked("/dashboard")).toBe(false);
  });
});
