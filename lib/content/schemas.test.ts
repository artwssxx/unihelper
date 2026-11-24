import { describe, expect, it } from "vitest";
import { PROGRAMS } from "@/data/programs";
import { EVENTS } from "./events";
import { LESSONS } from "./lessons";
import { eventSchema, lessonSchema, programSchema } from "./schemas";

describe("схемы контента админки", () => {
  it("все программы из кода проходят схему", () => {
    for (const p of PROGRAMS) expect(programSchema.safeParse(p).success, p.id).toBe(true);
  });
  it("все ивенты из кода проходят схему", () => {
    for (const e of EVENTS) expect(eventSchema.safeParse(e).success, e.id).toBe(true);
  });
  it("все уроки из кода проходят схему", () => {
    for (const l of LESSONS) expect(lessonSchema.safeParse(l).success, l.id).toBe(true);
  });
  it("схема отклоняет неверные данные", () => {
    expect(programSchema.safeParse({ ...PROGRAMS[0], acceptanceRate: 3 }).success).toBe(false);
    expect(programSchema.safeParse({ ...PROGRAMS[0], id: "Плохой ID" }).success).toBe(false);
  });
});
