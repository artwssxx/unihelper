import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Слой ИИ, не привязанный к провайдеру.
//  - gemini (по умолчанию, бесплатный тариф Google AI Studio) — через OpenAI-совместимый endpoint;
//  - compat — любой OpenAI-совместимый API (Groq, OpenRouter и т. п.);
//  - anthropic — Claude API.
// Выбор: AI_PROVIDER, иначе первый провайдер, для которого задан ключ.
// «fast» — чат и советы, «smart» — оценка Writing и эссе.

export type Tier = "fast" | "smart";
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LlmImage = { mime: "image/png" | "image/jpeg" | "image/webp"; data: string };

export interface LLM {
  name: string;
  /** timeoutMs — лимит на один вызов модели (по умолчанию 20/28 с); для длинных ответов, например текста IELTS, больше. */
  /** images — картинки (base64) для распознавания, например скриншот результата экзамена. */
  json<T>(o: { system: string; user: string; schema: z.ZodType<T>; tier: Tier; maxTokens?: number; timeoutMs?: number; images?: LlmImage[] }): Promise<T>;
  stream(o: { system: string; messages: ChatMessage[]; tier: Tier; maxTokens?: number }): AsyncGenerator<string>;
}

const list = (v: string | undefined, d: string[]) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);

// ───────────── OpenAI-совместимые провайдеры (Gemini, Groq, OpenRouter…) ─────────────

class RetryableError extends Error {}

function compatProvider(cfg: { name: string; baseUrl: string; key: string; models: Record<Tier, string[]> }): LLM {
  const headers = { authorization: `Bearer ${cfg.key}`, "content-type": "application/json" };

  // Бюджет каждого запроса: укладываемся в лимит функции Vercel (maxDuration = 60 с).
  async function call(model: string, body: Record<string, unknown>, tier: Tier, deadline: number, timeoutMs?: number): Promise<Response> {
    const budgetLeft = () => deadline - Date.now();
    if (budgetLeft() < 3_000) throw new Error(`${cfg.name}: время на ответ исчерпано`);
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, ...body }),
        signal: AbortSignal.timeout(Math.max(3_000, Math.min(timeoutMs ?? (tier === "fast" ? 20_000 : 28_000), budgetLeft()))),
      });
    } catch (e) {
      throw new RetryableError(`${model}: ${(e as Error).message}`);
    }
    // Перегрузка, лимит, модель недоступна → пробуем следующую модель.
    if ([404, 408, 429, 500, 502, 503, 504].includes(res.status)) throw new RetryableError(`${model}: HTTP ${res.status}`);
    if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  return {
    name: cfg.name,

    async json({ system, user, schema, tier, maxTokens = 4000, timeoutMs, images }) {
      const deadline = Date.now() + 55_000;
      const content = images?.length
        ? [{ type: "text", text: user }, ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data}` } }))]
        : user;
      const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
      const sys = `${system}\n\nОтвечай ТОЛЬКО валидным JSON без пояснений и без markdown, строго по этой JSON Schema:\n${jsonSchema}`;
      const errors: string[] = [];
      for (const model of cfg.models[tier]) {
        try {
          const res = await call(model, {
            messages: [{ role: "system", content: sys }, { role: "user", content }],
            response_format: { type: "json_object" },
            max_tokens: maxTokens,
          }, tier, deadline, timeoutMs);
          const data = await res.json();
          const text: string = data.choices?.[0]?.message?.content ?? "";
          const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
          const parsed = schema.safeParse(JSON.parse(cleaned));
          if (parsed.success) return parsed.data;
          errors.push(`${model}: schema mismatch`);
        } catch (e) {
          if (!(e instanceof RetryableError) && !(e instanceof SyntaxError)) throw e;
          errors.push((e as Error).message);
        }
      }
      throw new Error(`[${cfg.name}] все модели недоступны: ${errors.join("; ")}`);
    },

    async *stream({ system, messages, tier, maxTokens = 3000 }) {
      const deadline = Date.now() + 55_000;
      const errors: string[] = [];
      for (const model of cfg.models[tier]) {
        let res: Response;
        try {
          res = await call(model, { messages: [{ role: "system", content: system }, ...messages], stream: true, max_tokens: maxTokens }, tier, deadline);
        } catch (e) {
          if (!(e instanceof RetryableError)) throw e;
          errors.push((e as Error).message);
          continue;
        }
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const payload = l.slice(5).trim();
            if (payload === "[DONE]") return;
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (delta) yield delta as string;
            } catch {
              /* неполная строка — пропускаем */
            }
          }
        }
        return;
      }
      throw new Error(`[${cfg.name}] все модели недоступны: ${errors.join("; ")}`);
    },
  };
}

// ───────────── Claude ─────────────

function anthropicProvider(): LLM {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  // Отказ по политике безопасности → сервер повторит запрос на модели-замене.
  const fallback = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  return {
    name: "anthropic",
    async json({ system, user, schema, tier, maxTokens = 4000, images }) {
      const content = images?.length
        ? [...images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.mime, data: i.data } })), { type: "text" as const, text: user }]
        : user;
      const res = await client.beta.messages.parse({
        model, max_tokens: maxTokens, ...fallback,
        output_config: { effort: tier === "smart" ? "medium" : "low", format: betaZodOutputFormat(schema) },
        system, messages: [{ role: "user", content }],
      });
      if (res.stop_reason === "refusal" || res.parsed_output == null) throw new Error("anthropic: no output");
      return res.parsed_output as z.infer<typeof schema>;
    },
    async *stream({ system, messages, tier, maxTokens = 8000 }) {
      const stream = client.beta.messages.stream({
        model, max_tokens: maxTokens, ...fallback,
        output_config: { effort: tier === "smart" ? "medium" : "low" },
        system, messages,
      });
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") yield "\n\nНе могу ответить на этот вопрос.";
    },
  };
}

// ───────────── Выбор провайдера ─────────────

let cached: LLM | null | undefined;

export function llm(): LLM | null {
  if (cached !== undefined) return cached;
  const want = process.env.AI_PROVIDER;
  const gemini = process.env.GEMINI_API_KEY;
  const compat = process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL;
  const claude = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;

  const make = (name: string): LLM | null => {
    if (name === "gemini" && gemini) {
      return compatProvider({
        name: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        key: gemini,
        models: {
          fast: list(process.env.GEMINI_MODELS_FAST, ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"]),
          smart: list(process.env.GEMINI_MODELS_SMART, ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"]),
        },
      });
    }
    if (name === "compat" && compat) {
      const models = list(process.env.OPENAI_COMPAT_MODELS, []);
      if (!models.length) return null;
      return compatProvider({
        name: "compat",
        baseUrl: process.env.OPENAI_COMPAT_BASE_URL!.replace(/\/$/, ""),
        key: process.env.OPENAI_COMPAT_API_KEY!,
        models: { fast: models, smart: models },
      });
    }
    if (name === "anthropic" && claude) return anthropicProvider();
    return null;
  };

  cached = want ? make(want) : make("gemini") ?? make("anthropic") ?? make("compat");
  return cached;
}
