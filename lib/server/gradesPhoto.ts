import "server-only";
import { z } from "zod";
import { detectScale, gradeFromGroup, parseGradesText, subjectKey, type GradeItem, type GradeScale } from "@/lib/grades";
import { llm, type LlmImage } from "./llm";
import { pdfText } from "./scoreReport";

// Оценки с фото/скриншота табеля, дневника eMaktab или страницы EMIS, либо из PDF.
// Сначала разбор по правилам (текст PDF), затем ИИ (картинки). Берём только предметы и оценки:
// имя, номер, дату рождения и т. п. не возвращаем. Файл нигде не сохраняется.

const Out = z.object({
  items: z.array(z.object({ subject: z.string(), grade: z.number() })).describe("Предметы и итоговая или средняя оценка по каждому"),
  scale: z.union([z.literal(5), z.literal(10), z.literal(100)]).describe("Шкала оценок в документе"),
  className: z.string().nullable().describe("Класс или курс, например «10-A» или «2-kurs», если виден; иначе null"),
  period: z.string().nullable().describe("Период, например «2025/26, 2 chorak», если виден; иначе null"),
});

const SYSTEM = `Ты распознаёшь оценки ученика по предметам с фото или скриншота табеля, электронного дневника (eMaktab) или системы лицея (EMIS).
Правила:
- Верни каждый предмет один раз с ОДНОЙ оценкой: итоговая за год или последнюю четверть, если есть; иначе среднее из отметок по предмету (до сотых).
- Названия предметов пиши как в документе (узбекский, русский или английский).
- Только то, что видно. Не выдумывай предметы и оценки. Пропуски («н», «nb») и пустые клетки не считай.
- НЕ возвращай имя ученика, учителей, номер документа, дату рождения и другие личные данные.
- Если оценок на изображении нет — верни пустой список.`;

export type PhotoResult =
  | { status: "ok"; items: GradeItem[]; scale: GradeScale; grade: number | null; className: string | null; period: string | null; via: "rules" | "ai" }
  | { status: "error"; message: string };

const clean = (items: { subject: string; grade: number }[], scale: GradeScale): GradeItem[] => {
  const seen = new Set<string>();
  return items
    .map((i) => ({ subject: i.subject.replace(/\s+/g, " ").trim().slice(0, 80), grade: Math.round(i.grade * 100) / 100 }))
    .filter((i) => i.subject.length >= 2 && i.grade > 0 && i.grade <= scale && !seen.has(i.subject.toLowerCase()) && seen.add(i.subject.toLowerCase()))
    .slice(0, 40)
    .map((i) => ({ ...i, key: subjectKey(i.subject) }));
};

export async function gradesFromFile(file: { mime: string; base64: string }): Promise<PhotoResult> {
  let text = "";
  const images: LlmImage[] = [];
  if (file.mime === "application/pdf") {
    text = await pdfText(file.base64).catch(() => "");
    const byRules = parseGradesText(text);
    if (byRules && byRules.items.length >= 3)
      return { status: "ok", items: byRules.items.slice(0, 40), scale: byRules.scale, grade: gradeFromGroup(text.match(/\b\d{1,2}\s*[-–]?\s*[«"]?[A-ZА-ЯЎҚҒҲ]\b/u)?.[0]), className: null, period: null, via: "rules" };
    if (text.trim().length < 30) return { status: "error", message: "В PDF нет текста (похоже на скан). Загрузи фото или скриншот — так ИИ сможет прочитать оценки." };
  } else images.push({ mime: file.mime as LlmImage["mime"], data: file.base64 });

  const ai = llm();
  if (!ai) return { status: "error", message: "Распознавание фото сейчас недоступно. Скопируй таблицу оценок и вставь её текстом или введи вручную." };
  try {
    const r = await ai.json({ system: SYSTEM, user: text ? `Текст документа:\n${text.slice(0, 7000)}` : "Распознай оценки на изображении.", schema: Out, tier: "fast", images, maxTokens: 2500, timeoutMs: 40_000 });
    const scale = r.items.length ? (r.items.some((i) => i.grade > r.scale) ? detectScale(r.items.map((i) => i.grade)) : r.scale) : r.scale;
    const items = clean(r.items, scale);
    if (!items.length) return { status: "error", message: "На изображении не нашлось оценок. Сфотографируй табель ровно и целиком или вставь таблицу текстом." };
    return { status: "ok", items, scale, grade: gradeFromGroup(r.className), className: r.className, period: r.period, via: "ai" };
  } catch (e) {
    console.error("[grades-photo]", (e as Error).message.slice(0, 160));
    return { status: "error", message: "ИИ сейчас перегружен и не смог прочитать фото. Попробуй через минуту, вставь таблицу текстом или введи оценки вручную." };
  }
}
