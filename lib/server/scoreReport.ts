import "server-only";
import { z } from "zod";
import { cleanIelts, cleanSat, parseScoreDate, parseScoreText, ruleAnalysis, type IeltsScores, type SatScores, type ScoreAnalysis, type ScoreExam } from "@/lib/scores";
import { llm, type LlmImage } from "./llm";
import { LANG_RULE } from "./replyLang";
import type { Lang } from "@/lib/i18n/translate";

// Разбор результата IELTS/SAT: из файла (PDF → текст, картинка → распознавание ИИ) или описания.
// ИИ берёт только баллы, которые видит, и не возвращает личные данные. Без ИИ — разбор по правилам.

const n = z.number().nullable();
const Out = z.object({
  exam: z.enum(["ielts", "sat"]),
  isOfficialReport: z.boolean().describe("true — это официальный отчёт о результатах (TRF / College Board)"),
  testDate: z.string().nullable().describe("Дата экзамена YYYY-MM-DD, если видна; иначе null"),
  ielts: z.object({ listening: n, reading: n, writing: n, speaking: n, overall: n }).nullable(),
  sat: z.object({ math: n, rw: n, total: n }).nullable(),
  summary: z.string().describe("2–3 предложения: что видно по результату"),
  strengths: z.array(z.string()).describe("1–3 сильные стороны"),
  weaknesses: z.array(z.string()).describe("1–3 слабых места"),
  plan: z.array(z.object({ title: z.string(), weeks: z.number(), actions: z.array(z.string()) })).describe("2–4 шага плана на 4–12 недель"),
  targetNote: z.string().describe("Сравнение с целью ученика, если она дана; иначе совет поставить цель"),
});

const SYSTEM = `Ты разбираешь результат экзамена IELTS или SAT для ученика из Узбекистана, который поступает за рубеж на грант.
Правила:
- Бери ТОЛЬКО баллы, которые явно есть в файле или описании. Не выдумывай баллы, даты и требования вузов.
- НЕ возвращай личные данные: имя, номер кандидата, дату рождения, номер паспорта, адрес — даже если они видны.
- IELTS: секции 0–9 с шагом 0.5. SAT: Math и Reading and Writing по 200–800, сумма 400–1600.
- Если ученик описал, где ошибался (типы вопросов, критерии Writing, время), используй это в разборе.
- План — конкретные действия по неделям: моки, типы заданий, упражнения. Коротко.
- Не обещай поступление и не называй процентов шансов.`;

export interface AnalyzeInput {
  exam: ScoreExam;
  text: string;
  manual?: { ielts?: IeltsScores; sat?: SatScores };
  file?: { mime: string; base64: string };
  target?: { ielts?: number | null; sat?: number | null };
  lang?: Lang;
}

export interface AnalyzeResult {
  exam: ScoreExam;
  kind: "official" | "self";
  date: string | null;
  ielts?: IeltsScores;
  sat?: SatScores;
  analysis: ScoreAnalysis;
  note?: string;
}

async function pdfText(base64: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(base64, "base64")));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/\s+\n/g, "\n").slice(0, 8000);
}

const merge = <T extends object>(a: T | undefined, b: T | undefined): T => {
  const out = { ...(a ?? {}) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(b ?? {})) if (v != null) out[k] = v;
  return out as T;
};

export async function analyzeScore(i: AnalyzeInput): Promise<AnalyzeResult> {
  let fileText = "";
  let note: string | undefined;
  const images: LlmImage[] = [];
  if (i.file) {
    if (i.file.mime === "application/pdf") {
      fileText = await pdfText(i.file.base64).catch(() => "");
      if (fileText.trim().length < 30) note = "Из PDF не удалось достать текст (похоже на скан). Загрузите скриншот или фото — так ИИ сможет его прочитать.";
    } else if (["image/png", "image/jpeg", "image/webp"].includes(i.file.mime)) {
      images.push({ mime: i.file.mime as LlmImage["mime"], data: i.file.base64 });
    }
  }

  // Что видно без ИИ: ручной ввод сильнее, чем разобранный текст.
  const parsed = parseScoreText(`${i.text}\n${fileText}`);
  const base = { ielts: merge(parsed.ielts, i.manual?.ielts), sat: merge(parsed.sat, i.manual?.sat) };

  const m = llm();
  if (m && (i.text.trim() || fileText || images.length)) {
    try {
      const out = await m.json({
        tier: "smart",
        schema: Out,
        images,
        timeoutMs: 40_000,
        maxTokens: 2500,
        system: `${SYSTEM}\n- ${LANG_RULE[i.lang ?? "ru"]}`,
        user: `Экзамен, который выбрал ученик: ${i.exam.toUpperCase()}.
Цель ученика: ${i.exam === "ielts" ? (i.target?.ielts ? `IELTS ${i.target.ielts}` : "не задана") : i.target?.sat ? `SAT ${i.target.sat}` : "не задана"}.
Баллы, введённые вручную (точные, если есть): ${JSON.stringify(i.manual ?? {})}.
Описание ученика: ${i.text.trim() || "—"}
${fileText ? `Текст из PDF-файла:\n${fileText}` : images.length ? "Изображение результата приложено." : ""}`,
      });
      const ielts = cleanIelts(merge(out.ielts ?? undefined, i.manual?.ielts));
      const sat = cleanSat(merge(out.sat ?? undefined, i.manual?.sat));
      const date = out.testDate && /^\d{4}-\d{2}-\d{2}$/.test(out.testDate) ? out.testDate : parseScoreDate(`${fileText}\n${i.text}`);
      return {
        exam: i.exam,
        kind: out.isOfficialReport && i.file ? "official" : "self",
        date,
        ...(i.exam === "ielts" ? { ielts } : { sat }),
        analysis: { summary: out.summary, strengths: out.strengths.slice(0, 3), weaknesses: out.weaknesses.slice(0, 3), plan: out.plan.slice(0, 4), targetNote: out.targetNote, ai: true },
        note,
      };
    } catch (e) {
      console.error("[score analyze]", (e as Error).message);
      note = note ?? "ИИ сейчас недоступен — показан разбор по правилам.";
    }
  }
  const rec = { exam: i.exam, ielts: cleanIelts(base.ielts), sat: cleanSat(base.sat) };
  return {
    exam: i.exam,
    kind: "self",
    date: parseScoreDate(`${fileText}\n${i.text}`),
    ...(i.exam === "ielts" ? { ielts: rec.ielts } : { sat: rec.sat }),
    analysis: ruleAnalysis(rec, i.target),
    note: images.length && !m ? "Чтобы прочитать картинку, нужен ИИ. Введите баллы вручную." : note,
  };
}
