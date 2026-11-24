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

import { POSTS } from "./posts";
import { postSchema } from "./schemas";
import { parseBody } from "@/components/site/Prose";

describe("блог", () => {
  it("статьи из кода проходят схему и имеют уникальные адреса", () => {
    for (const p of POSTS) expect(postSchema.safeParse(p).success, p.id).toBe(true);
    expect(new Set(POSTS.map((p) => p.id)).size).toBe(POSTS.length);
  });
  it("разбор текста: подзаголовки, списки, абзацы; HTML не исполняется", () => {
    const b = parseBody("Абзац один.\n\n## Заголовок\n\n- раз\n- два\n\n<script>alert(1)</script>");
    expect(b.map((x) => x.type)).toEqual(["p", "h", "ul", "p"]);
    expect(b[3]).toEqual({ type: "p", text: "<script>alert(1)</script>" });
  });
});
