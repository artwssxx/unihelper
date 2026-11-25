import { describe, expect, it } from "vitest";
import { REPEAT, SHOP, TASKS } from "./coins";

describe("UniCoins: конфиг", () => {
  it("задания и товары с уникальными ID, награды и цены положительные", () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
    expect(new Set(SHOP.map((s) => s.id)).size).toBe(SHOP.length);
    for (const t of TASKS) expect(t.reward).toBeGreaterThan(0);
    for (const s of SHOP) expect(s.price).toBeGreaterThan(0);
  });
  it("бонусы серии растут, Pro на неделю выгоднее семи дней по отдельности", () => {
    const b = Object.entries(REPEAT.streakBonus).sort((a, c) => Number(a[0]) - Number(c[0])).map(([, v]) => v);
    expect([...b].sort((a, c) => a - c)).toEqual(b);
    const day = SHOP.find((s) => s.id === "pro_day")!.price, week = SHOP.find((s) => s.id === "pro_week")!.price;
    expect(week).toBeLessThan(day * 7);
  });
});
