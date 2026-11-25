import { describe, expect, it } from "vitest";
import { z } from "zod";
import { chain, type LLM } from "./llm";

const fake = (name: string, o: { fail?: boolean; failAfter?: number; vision?: boolean; reply?: string } = {}): LLM & { calls: number } => {
  const f = {
    name, calls: 0, vision: o.vision,
    async json<T>() { f.calls++; if (o.fail) throw new Error("HTTP 503"); return { answer: o.reply ?? name } as T; },
    async *stream() {
      f.calls++;
      if (o.fail) throw new Error("HTTP 429");
      const parts = (o.reply ?? name).split(" ");
      for (const [i, p] of parts.entries()) {
        if (o.failAfter != null && i >= o.failAfter) throw new Error("обрыв");
        yield p;
      }
    },
  };
  return f;
};
const schema = z.object({ answer: z.string() });
const read = async (g: AsyncGenerator<string>) => { const out: string[] = []; for await (const t of g) out.push(t); return out.join(" "); };

describe("цепочка ИИ-провайдеров", () => {
  it("перегружен основной — отвечает запасной", async () => {
    const a = fake("gemini", { fail: true }), b = fake("groq");
    const r = await chain([a, b]).json({ system: "", user: "", schema, tier: "fast" });
    expect(r).toEqual({ answer: "groq" });
    expect(a.calls).toBe(1);
  });
  it("картинки — только провайдерам с распознаванием", async () => {
    const a = fake("gemini-v", { fail: true }), b = fake("cerebras-v", { vision: false }), c = fake("mistral-v", { vision: true });
    const r = await chain([a, b, c]).json({ system: "", user: "", schema, tier: "fast", images: [{ mime: "image/png", data: "" }] });
    expect(r).toEqual({ answer: "mistral-v" });
    expect(b.calls).toBe(0);
  });
  it("стрим: переключается, пока ничего не отдал; обрыв посреди ответа не повторяет", async () => {
    expect(await read(chain([fake("gemini-s1", { fail: true }), fake("groq-s1", { reply: "привет мир" })]).stream({ system: "", messages: [], tier: "fast" }))).toBe("привет мир");
    const b = fake("groq-s2");
    await expect(read(chain([fake("gemini-s2", { reply: "раз два три", failAfter: 1 }), b]).stream({ system: "", messages: [], tier: "fast" }))).rejects.toThrow("обрыв");
    expect(b.calls).toBe(0);
  });
  it("все недоступны — понятная ошибка", async () => {
    await expect(chain([fake("gemini-x", { fail: true }), fake("groq-x", { fail: true })]).json({ system: "", user: "", schema, tier: "fast" })).rejects.toThrow("все провайдеры недоступны");
  });
});

describe("перегруженный провайдер уходит в конец очереди", () => {
  it("второй запрос сразу идёт к запасному", async () => {
    const a = fake("gemini-cd", { fail: true }), b = fake("groq-cd");
    const c = chain([a, b]);
    await c.json({ system: "", user: "", schema, tier: "fast" });
    expect(a.calls).toBe(1);
    await c.json({ system: "", user: "", schema, tier: "fast" });
    expect(a.calls).toBe(1); // в «паузе» — не вызывался
    expect(b.calls).toBe(2);
  });
});
