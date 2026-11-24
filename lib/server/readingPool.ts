import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { registerQuestions } from "@/lib/mocks/engine";
import type { Passage, Question } from "@/lib/mocks/types";
import { llm } from "./llm";
import { supabaseAdmin } from "./supabase";

// Пул тестов IELTS Academic Reading: ИИ пишет оригинальный текст и вопросы, код проверяет,
// а второй независимый проход ИИ решает вопросы без ответов. Остаются только совпавшие.
// Ученик получает тест, которого ещё не видел; если пул пуст — исходный тест из банка.

export const TFNG = ["TRUE", "FALSE", "NOT GIVEN"];
const LETTER = ["A", "B", "C", "D"];

const TextSchema = z.object({
  title: z.string().describe("Заголовок текста на английском"),
  paragraphs: z.array(z.string()).describe("5–7 абзацев академического текста на английском, всего 650–850 слов"),
});
const QSchema = z.object({
  tfng: z
    .array(z.object({ statement: z.string(), answer: z.enum(["TRUE", "FALSE", "NOT GIVEN"]), evidence: z.string().describe("Дословная цитата из текста; пусто для NOT GIVEN") }))
    .describe("5–6 утверждений True/False/Not Given, все три варианта ответа встречаются"),
  mcq: z
    .array(z.object({ question: z.string(), options: z.array(z.string()).describe("Ровно 4 варианта"), answer: z.enum(["A", "B", "C", "D"]), evidence: z.string().describe("Дословная цитата из текста") }))
    .describe("3–4 вопроса с выбором одного ответа"),
  completion: z
    .array(z.object({ sentence: z.string().describe("Предложение с пропуском ______, перефразирует текст"), answer: z.string().describe("1–2 слова ДОСЛОВНО из текста"), evidence: z.string().describe("Дословная цитата из текста, содержащая ответ") }))
    .describe("4 предложения на заполнение пропуска"),
});
export type RawQuestions = z.infer<typeof QSchema>;

const SolveSchema = z.object({
  tfng: z.array(z.enum(["TRUE", "FALSE", "NOT GIVEN"])),
  mcq: z.array(z.enum(["A", "B", "C", "D"])),
  completion: z.array(z.string()),
});

const TOPICS = [
  "the history and science of a natural resource", "an engineering innovation in water or energy", "how animals navigate or communicate",
  "urban planning and public spaces", "a development in medicine or public health", "the economics of a common product",
  "archaeology of an ancient trade route", "climate and agriculture", "the psychology of learning or decision-making",
  "materials science in everyday objects", "conservation of an ecosystem", "the history of a scientific instrument",
];
const LEVEL = ["easier (Passage 1: factual, clear structure)", "medium (Passage 2: more detail, some opinions reported)", "harder (Passage 3: argumentative, the writer expresses views)"];
const SYSTEM =
  "You write ORIGINAL IELTS Academic Reading practice material. Never copy or paraphrase texts from Cambridge IELTS books or any published test. Facts must be general and uncontroversial; do not invent precise statistics, dates or names of real people. Use British English.";

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9'" ]+/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export interface PassageDraft {
  title: string;
  text: string;
  questions: { kind: "tfng" | "mcq" | "completion"; stem: string; choices?: string[]; answer: string }[];
  checks: { generated: number; kept: number; dropped: string[] };
}

function ai() {
  const m = llm();
  if (!m) throw new Error("ai_disabled");
  return m;
}

/** Шаг 1: текст (самый длинный ответ — даём модели до 50 с). */
export async function generateText(n: 1 | 2 | 3, avoidTitles: string[] = []): Promise<{ title: string; text: string }> {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const g = await ai().json({
    tier: "smart", schema: TextSchema, maxTokens: 3000, timeoutMs: 50_000, system: SYSTEM,
    user: `Write Reading Passage ${n}, difficulty ${LEVEL[n - 1]}. Topic area: ${topic}.${avoidTitles.length ? ` Do not reuse these titles or topics: ${avoidTitles.join("; ")}.` : ""}
650–850 words in 5–7 paragraphs. Only the title and paragraphs — no questions.`,
  });
  const text = g.paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n");
  if (words(text) < 450) throw new Error("text_too_short");
  return { title: g.title.trim(), text };
}

/** Шаг 2: вопросы к тексту + проверки кодом (цитаты есть в тексте, ответы пропусков — дословно из текста). */
export async function generateQuestions(n: 1 | 2 | 3, text: string): Promise<{ raw: RawQuestions; dropped: string[]; generated: number }> {
  const raw = await ai().json({
    tier: "smart", schema: QSchema, maxTokens: 3000, timeoutMs: 45_000, system: SYSTEM,
    user: `PASSAGE ${n}:\n${text}\n\nWrite questions for this passage.
- TRUE/FALSE/NOT GIVEN: test meaning, not word matching; NOT GIVEN statements are about the topic but unanswerable from the text.
- Multiple choice: exactly one option is supported by the text; distractors use words from the text but are wrong.
- Completion: the answer is 1–2 words copied exactly from the text; the sentence paraphrases the text around it.
- Every evidence field is an exact quote from the passage (except NOT GIVEN).`,
  });
  const ntext = norm(text);
  const inText = (q: string) => !q.trim() || ntext.includes(norm(q).slice(0, 120));
  const dropped: string[] = [];
  const generated = raw.tfng.length + raw.mcq.length + raw.completion.length;
  const tfng = raw.tfng.filter((q) => (q.statement.length > 15 && (q.answer === "NOT GIVEN" || (q.evidence && inText(q.evidence)))) || (dropped.push(`формат tfng: ${q.statement.slice(0, 60)}`), false));
  const mcq = raw.mcq.filter((q) => (q.options.length === 4 && new Set(q.options.map(norm)).size === 4 && inText(q.evidence)) || (dropped.push(`формат mcq: ${q.question.slice(0, 60)}`), false));
  const completion = raw.completion.filter(
    (q) => (q.sentence.includes("______") && words(q.answer) >= 1 && words(q.answer) <= 2 && ntext.includes(norm(q.answer)) && inText(q.evidence)) || (dropped.push(`формат пропуска: ${q.sentence.slice(0, 60)}`), false),
  );
  return { raw: { tfng, mcq, completion }, dropped, generated };
}

/** Шаг 3: независимое решение без ответов — остаются только совпавшие вопросы. */
export async function verifyQuestions(title: string, text: string, q: RawQuestions, prior: { dropped: string[]; generated: number }): Promise<PassageDraft> {
  const solved = await ai().json({
    tier: "fast", schema: SolveSchema, maxTokens: 800, timeoutMs: 30_000,
    system: "You are a careful IELTS candidate. Answer strictly from the passage.",
    user: `PASSAGE:\n${text}\n\nTRUE/FALSE/NOT GIVEN:\n${q.tfng.map((x, i) => `${i + 1}. ${x.statement}`).join("\n")}\n\nMULTIPLE CHOICE (answer with a letter):\n${q.mcq
      .map((x, i) => `${i + 1}. ${x.question}\n${x.options.map((o, j) => `${LETTER[j]}) ${o}`).join("\n")}`)
      .join("\n")}\n\nCOMPLETE WITH NO MORE THAN TWO WORDS FROM THE PASSAGE:\n${q.completion.map((x, i) => `${i + 1}. ${x.sentence}`).join("\n")}\n\nReturn answers in the same order.`,
  });
  const dropped = [...prior.dropped];
  const keepT = q.tfng.filter((x, i) => solved.tfng[i] === x.answer || (dropped.push(`решатель не согласен (tfng): ${x.statement.slice(0, 50)}`), false));
  const keepM = q.mcq.filter((x, i) => solved.mcq[i] === x.answer || (dropped.push(`решатель не согласен (mcq): ${x.question.slice(0, 50)}`), false));
  const keepC = q.completion.filter((x, i) => norm(solved.completion[i] ?? "") === norm(x.answer) || (dropped.push(`решатель не согласен (пропуск): ${x.sentence.slice(0, 50)}`), false));
  const questions: PassageDraft["questions"] = [
    ...keepT.map((x) => ({ kind: "tfng" as const, stem: x.statement, choices: TFNG, answer: LETTER[TFNG.indexOf(x.answer)] })),
    ...keepM.map((x) => ({ kind: "mcq" as const, stem: x.question, choices: x.options, answer: x.answer })),
    ...keepC.map((x) => ({ kind: "completion" as const, stem: x.sentence, answer: x.answer })),
  ];
  return { title, text, questions, checks: { generated: prior.generated, kept: questions.length, dropped } };
}

/** Собирает тест из трёх проверенных текстов и сохраняет в пул. Нужно не меньше 30 вопросов. */
export async function saveTest(drafts: PassageDraft[]): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = supabaseAdmin();
  if (!db) return { ok: false, error: "no_database" };
  if (drafts.length !== 3) return { ok: false, error: "Нужно три текста." };
  const total = drafts.reduce((s, d) => s + d.questions.length, 0);
  if (total < 30) return { ok: false, error: `После проверки осталось ${total} вопросов — нужно не меньше 30. Сгенерируйте слабый текст заново.` };
  const id = randomBytes(5).toString("hex");
  const { passages, questions } = toQuestions(id, drafts);
  const { error } = await db.from("mock_reading_tests").insert({
    id, title: drafts.map((d) => d.title).join(" · "), passages, questions, status: "auto", source: "ai",
    checks: drafts.map((d) => d.checks),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

const GROUP: Record<string, (from: number, to: number, n: number) => string> = {
  tfng: (a, b, n) => `Questions ${a}–${b}. Do the following statements agree with the information in Reading Passage ${n}? Choose TRUE, FALSE or NOT GIVEN.`,
  mcq: (a, b) => `Questions ${a}–${b}. Choose the correct letter, A, B, C or D.`,
  completion: (a, b) => `Questions ${a}–${b}. Complete the sentences. Choose NO MORE THAN TWO WORDS from the passage for each answer.`,
};
const SKILL = { tfng: "True/False/Not Given", mcq: "Multiple choice", completion: "Sentence completion" } as const;

export function toQuestions(id: string, drafts: PassageDraft[]): { passages: Passage[]; questions: Question[] } {
  const passages: Passage[] = drafts.map((d, i) => ({ id: `${id}-p${i + 1}`, title: d.title, text: d.text }));
  const questions: Question[] = [];
  let k = 1;
  drafts.forEach((d, pi) => {
    for (const kind of ["tfng", "mcq", "completion"] as const) {
      const block = d.questions.filter((q) => q.kind === kind);
      block.forEach((q, j) => {
        questions.push({
          id: `rt-${id}-q${k}`, exam: "ielts", section: "reading", passageId: passages[pi].id,
          group: j === 0 ? GROUP[kind](k, k + block.length - 1, pi + 1) : undefined,
          domain: `Passage ${pi + 1}`, skill: SKILL[kind], difficulty: (pi + 1) as 1 | 2 | 3,
          stem: q.stem, choices: q.choices, answerType: kind === "completion" ? "text" : "mcq", answer: q.answer,
          explanation: kind === "completion" ? `Ответ дословно из текста: «${q.answer}».` : kind === "tfng" ? `Ответ: ${TFNG[LETTER.indexOf(q.answer)]}. Найдите в тексте место, где говорится об этом.` : `Ответ ${q.answer}: он подтверждается текстом, остальные варианты — нет.`,
          source: "ai", verified: true,
        });
        k++;
      });
    }
  });
  return { passages, questions };
}

type Row = { id: string; passages: Passage[]; questions: Question[] };

/** Тест для попытки: самый свежий из пула, которого ученик ещё не видел. */
export async function pickPoolTest(seen: Set<string>): Promise<Row | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("mock_reading_tests").select("id,passages,questions").in("status", ["auto", "verified"]).order("created_at", { ascending: false }).limit(50);
  const fresh = (data ?? []).filter((t) => !(t.questions as Question[]).some((q) => seen.has(q.id)));
  const t = (fresh[0] ?? null) as Row | null;
  if (t) registerQuestions(t.questions);
  return t;
}

/** Перед проверкой ответов: подгрузить вопросы теста из пула (на другом сервере кэша может не быть). */
export async function ensurePoolQuestions(ids: string[]): Promise<void> {
  const testIds = [...new Set(ids.filter((x) => x.startsWith("rt-")).map((x) => x.split("-")[1]))];
  if (!testIds.length) return;
  const db = supabaseAdmin();
  if (!db) return;
  const { data } = await db.from("mock_reading_tests").select("questions").in("id", testIds);
  for (const t of data ?? []) registerQuestions(t.questions as Question[]);
}
