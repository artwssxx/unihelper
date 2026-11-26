import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Слой ИИ, не привязанный к провайдеру.
//  - gemini (по умолчанию, бесплатный тариф Google AI Studio) — через OpenAI-совместимый endpoint;
//  - groq, mistral, cerebras, openrouter — бесплатные тарифы с OpenAI-совместимым API (ключи GROQ_API_KEY и т. д.);
//  - compat — любой другой OpenAI-совместимый API (OPENAI_COMPAT_*);
//  - anthropic — Claude API.
// Основной: AI_PROVIDER, иначе первый, для которого задан ключ. Остальные с ключами — запасные по цепочке
// (порядок — AI_FALLBACKS): перегрузка или лимит у основного → тот же запрос уходит следующему.
// «fast» — чат и советы, «smart» — оценка Writing и эссе.

export type Tier = "fast" | "smart";
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LlmImage = { mime: "image/png" | "image/jpeg" | "image/webp"; data: string };

export interface LLM {
  name: string;
  /** timeoutMs — лимит на один вызов модели (по умолчанию 20/28 с); для длинных ответов, например текста IELTS, больше. */
  /** images — картинки (base64) для распознавания, например скриншот результата экзамена. */
  json<T>(o: { system: string; user: string; schema: z.ZodType<T>; tier: Tier; maxTokens?: number; timeoutMs?: number; images?: LlmImage[]; deadlineAt?: number }): Promise<T>;
  stream(o: { system: string; messages: ChatMessage[]; tier: Tier; maxTokens?: number; deadlineAt?: number }): AsyncGenerator<string>;
  /** Умеет ли провайдер читать картинки. */
  vision?: boolean;
}

const list = (v: string | undefined, d: string[]) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);

// ───────────── OpenAI-совместимые провайдеры (Gemini, Groq, OpenRouter…) ─────────────

class RetryableError extends Error {}

// Модель, которой у провайдера больше нет (404), час не пробуем — не тратим время ответа.
const goneModels = new Map<string, number>();
const alive = (provider: string, models: string[]) => {
  const now = Date.now();
  const ok = models.filter((m) => (goneModels.get(`${provider}:${m}`) ?? 0) < now);
  return ok.length ? ok : models;
};

function compatProvider(cfg: { name: string; baseUrl: string; key: string; models: Record<Tier, string[]>; visionModels?: string[]; extraHeaders?: Record<string, string> }): LLM {
  const headers = { authorization: `Bearer ${cfg.key}`, "content-type": "application/json", ...cfg.extraHeaders };

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
    if (res.status === 404) goneModels.set(`${cfg.name}:${model}`, Date.now() + 3_600_000);
    if ([404, 408, 429, 500, 502, 503, 504].includes(res.status)) throw new RetryableError(`${model}: HTTP ${res.status}`);
    if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  return {
    name: cfg.name,
    vision: cfg.visionModels ? cfg.visionModels.length > 0 : true,

    async json({ system, user, schema, tier, maxTokens = 4000, timeoutMs, images, deadlineAt }) {
      const deadline = deadlineAt ?? Date.now() + 55_000;
      const models = alive(cfg.name, images?.length && cfg.visionModels ? cfg.visionModels : cfg.models[tier]);
      const content = images?.length
        ? [{ type: "text", text: user }, ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data}` } }))]
        : user;
      const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
      const sys = `${system}\n\nОтвечай ТОЛЬКО валидным JSON без пояснений и без markdown, строго по этой JSON Schema:\n${jsonSchema}`;
      const errors: string[] = [];
      for (const model of models) {
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

    async *stream({ system, messages, tier, maxTokens = 3000, deadlineAt }) {
      const deadline = deadlineAt ?? Date.now() + 55_000;
      const errors: string[] = [];
      for (const model of alive(cfg.name, cfg.models[tier])) {
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
        let got = false;
        let streamErr = "";
        let head = "";
        read: for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          if (head.length < 300) head += chunk;
          buf += chunk;
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const payload = l.slice(5).trim();
            if (payload === "[DONE]") break read;
            let j: { error?: { message?: string } | string; choices?: { delta?: { content?: string } }[] };
            try {
              j = JSON.parse(payload);
            } catch {
              continue; // неполная строка — пропускаем
            }
            if (j.error) streamErr = (typeof j.error === "string" ? j.error : j.error.message ?? "error").slice(0, 160);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              got = true;
              yield delta;
            }
          }
        }
        reader.cancel().catch(() => {});
        if (got) return;
        // Не поток, а обычный JSON (провайдер проигнорировал stream) — берём текст из него.
        if (!head.includes("data:")) {
          try {
            const j = JSON.parse(head + buf);
            const text = j.choices?.[0]?.message?.content;
            if (typeof text === "string" && text.trim()) {
              yield text;
              return;
            }
          } catch {
            /* не JSON */
          }
        }
        // Поток закрылся без текста (лимит, фильтр, ошибка внутри потока) — это сбой, пробуем следующую модель.
        errors.push(`${model}: пустой ответ (${streamErr || head.replace(/\s+/g, " ").slice(0, 220) || "нет данных"})`);
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

// ───────────── Цепочка: основной + запасные ─────────────

/** Пробует провайдеров по очереди. Стрим переключается, только если ещё ничего не успел отдать. */
/** Провайдер только что не ответил (перегрузка, лимит) — минуту ставим его в конец очереди, чтобы не ждать снова. */
const cooldown = new Map<string, number>();
const COOLDOWN_MS = 60_000;
/** Ключ не принят или нужна оплата (401/402/403) — это не пройдёт за минуту: 6 часов в конце очереди. */
const pause = (e: unknown) => (/HTTP 40[123]\b/.test((e as Error).message) ? 6 * 3_600_000 : COOLDOWN_MS);
const ordered = (list: LLM[]) => {
  const now = Date.now();
  return [...list].sort((a, b) => Number((cooldown.get(a.name) ?? 0) > now) - Number((cooldown.get(b.name) ?? 0) > now));
};

export function chain(input: LLM[], primaryBudgetMs = 30_000): LLM {
  if (input.length === 1) return input[0];
  return {
    name: input.map((l) => l.name).join(" → "),
    vision: input.some((l) => l.vision !== false),
    async json(o) {
      const end = Date.now() + 55_000;
      const errors: string[] = [];
      const list = ordered(input);
      const usable = o.images?.length ? list.filter((l) => l.vision !== false) : list;
      for (const [i, l] of usable.entries()) {
        // Основному — не весь лимит функции: запасным тоже нужно время.
        const deadlineAt = i === 0 && usable.length > 1 ? Math.min(end, Date.now() + primaryBudgetMs) : end;
        if (deadlineAt - Date.now() < 3_000) break;
        try {
          const r = await l.json({ ...o, deadlineAt });
          cooldown.delete(l.name);
          return r;
        } catch (e) {
          cooldown.set(l.name, Date.now() + pause(e));
          errors.push(`${l.name}: ${(e as Error).message.slice(0, 160)}`);
        }
      }
      throw new Error(`все провайдеры недоступны: ${errors.join(" | ")}`);
    },
    async *stream(o) {
      const end = Date.now() + 55_000;
      const errors: string[] = [];
      const list = ordered(input);
      for (const [i, l] of list.entries()) {
        const deadlineAt = i === 0 ? Math.min(end, Date.now() + primaryBudgetMs) : end;
        if (deadlineAt - Date.now() < 3_000) break;
        let started = false;
        try {
          for await (const t of l.stream({ ...o, deadlineAt })) {
            if (!t) continue;
            started = true;
            yield t;
          }
          if (!started) throw new Error("пустой ответ");
          cooldown.delete(l.name);
          return;
        } catch (e) {
          if (started) throw e; // часть ответа уже у ученика — не начинаем заново у другого провайдера
          cooldown.set(l.name, Date.now() + pause(e));
          errors.push(`${l.name}: ${(e as Error).message.slice(0, 160)}`);
        }
      }
      throw new Error(`все провайдеры недоступны: ${errors.join(" | ")}`);
    },
  };
}

// ───────────── Выбор провайдера ─────────────

let cached: LLM | null | undefined;

/** Бесплатные OpenAI-совместимые тарифы. Модели можно заменить переменными <ИМЯ>_MODELS / <ИМЯ>_MODELS_VISION. */
const PRESETS: Record<string, { env: string; baseUrl: string; fast: string[]; smart: string[]; vision: string[] }> = {
  groq: { env: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", fast: ["openai/gpt-oss-120b", "meta-llama/llama-4-scout-17b-16e-instruct", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"], smart: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "meta-llama/llama-4-scout-17b-16e-instruct"], vision: ["meta-llama/llama-4-scout-17b-16e-instruct"] },
  mistral: { env: "MISTRAL_API_KEY", baseUrl: "https://api.mistral.ai/v1", fast: ["mistral-small-latest"], smart: ["mistral-medium-latest", "mistral-small-latest"], vision: ["mistral-small-latest"] },
  cerebras: { env: "CEREBRAS_API_KEY", baseUrl: "https://api.cerebras.ai/v1", fast: ["gpt-oss-120b"], smart: ["gpt-oss-120b"], vision: [] },
  openrouter: { env: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", fast: ["openai/gpt-oss-120b:free", "meta-llama/llama-3.3-70b-instruct:free"], smart: ["openai/gpt-oss-120b:free"], vision: [] },
  // GitHub Models — бесплатно с личным токеном GitHub (scope models:read), лимиты на день.
  github: { env: "GITHUB_MODELS_TOKEN", baseUrl: "https://models.github.ai/inference", fast: ["openai/gpt-4.1-mini", "openai/gpt-4.1-nano"], smart: ["openai/gpt-4.1", "openai/gpt-4.1-mini"], vision: ["openai/gpt-4.1-mini"] },
  sambanova: { env: "SAMBANOVA_API_KEY", baseUrl: "https://api.sambanova.ai/v1", fast: ["Meta-Llama-3.3-70B-Instruct"], smart: ["Meta-Llama-3.3-70B-Instruct"], vision: [] },
};

/** Какие провайдеры настроены (имена, без ключей) — для админки. */
export function providerNames(): string[] {
  const out: string[] = [];
  if (process.env.GEMINI_API_KEY) out.push("gemini");
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) out.push("anthropic");
  if (process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL) out.push("compat");
  for (const [name, pre] of Object.entries(PRESETS)) if (process.env[pre.env]) out.push(name);
  return out;
}

/** Один провайдер отдельно (проверка из админки). */
export function providerByName(name: string): LLM | null {
  return makeProvider(name);
}

function makeProvider(name: string): LLM | null {
  const gemini = process.env.GEMINI_API_KEY;
  const compat = process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL;
  const claude = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
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
  const pre = PRESETS[name];
  if (pre && process.env[pre.env]) {
    const up = name.toUpperCase();
    const models = list(process.env[`${up}_MODELS`], []);
    return compatProvider({
      name,
      baseUrl: pre.baseUrl,
      key: process.env[pre.env]!,
      models: { fast: models.length ? models : pre.fast, smart: models.length ? models : pre.smart },
      visionModels: list(process.env[`${up}_MODELS_VISION`], pre.vision),
      ...(name === "openrouter" ? { extraHeaders: { "x-title": "UniHelper" } } : {}),
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
}

export function llm(): LLM | null {
  if (cached !== undefined) return cached;
  const want = process.env.AI_PROVIDER;
  const order = ["gemini", "anthropic", "compat", "groq", "mistral", "cerebras", "github", "sambanova", "openrouter"];
  const primary = want ? makeProvider(want) : order.map(makeProvider).find(Boolean) ?? null;
  if (!primary) return (cached = null);
  const fallbackOrder = list(process.env.AI_FALLBACKS, ["groq", "mistral", "cerebras", "github", "sambanova", "openrouter", "compat", "gemini", "anthropic"]);
  const fallbacks = fallbackOrder.filter((n) => n !== primary.name).map(makeProvider).filter((x): x is LLM => Boolean(x));
  cached = chain([primary, ...fallbacks]);
  return cached;
}
