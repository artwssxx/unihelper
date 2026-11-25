// Схема профиля вуза для ответа ИИ (только сервер: zod не должен попадать в браузер).
import { z } from "zod";
import { MAJORS } from "./profileConst";

const num = z.number().nullable();

export const UniProfileSchema = z.object({
  known: z.boolean().describe("true, если вуз реально существует и ты уверенно его знаешь"),
  confidence: z.enum(["low", "medium", "high"]),
  summary: z.string().describe("2–3 предложения: чем известен вуз, для кого подходит"),
  city: z.string().nullable(),
  website: z.string().nullable().describe("официальный сайт, https"),
  type: z.enum(["public", "private"]).nullable(),
  founded: num,
  students: num.describe("примерное число студентов"),
  qsRank: num.describe("место в QS World University Rankings, если входит в топ-1500"),
  theRank: num.describe("место в Times Higher Education, если известно"),
  acceptanceRate: num.describe("доля принятых 0..1, если известна"),
  languages: z.array(z.string()).describe("языки обучения на бакалавриате"),
  tuitionUsd: num.describe("обучение для иностранцев, $ в год"),
  livingUsd: num.describe("проживание и жизнь, $ в год"),
  applicationFeeUsd: num,
  intakes: z.array(z.string()).describe("месяцы начала обучения"),
  deadlines: z.array(z.object({ round: z.string(), date: z.string().describe("дата или месяц; если не уверен — «сверить»") })),
  requirements: z.object({
    minIelts: num,
    minToefl: num,
    satPolicy: z.enum(["required", "optional", "not_considered"]).nullable(),
    minGpa100: num,
    documents: z.array(z.string()).describe("что подают: эссе, рекомендации, портфолио, интервью…"),
  }),
  typical: z.object({ ielts: num, sat: num, gpa100: num }),
  scholarships: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["full", "partial"]),
      basis: z.enum(["need", "merit", "government"]),
      coverage: z.string().describe("что покрывает"),
      forUzbekistan: z.boolean().nullable().describe("доступна ли гражданам Узбекистана"),
    }),
  ),
  funding: z.object({
    type: z.enum(["none", "partial", "full"]),
    basis: z.enum(["need", "merit", "government", "none"]),
    needBlindIntl: z.boolean().nullable(),
    note: z.string(),
  }),
  strongMajors: z.array(z.string()).describe("сильные направления вуза"),
  majorsOffered: z.array(z.enum(MAJORS)).describe("какие из направлений списка есть на бакалавриате"),
  howToApply: z.object({ platform: z.string().nullable().describe("Common App, UCAS, uni-assist, Study in Korea, свой портал…"), steps: z.array(z.string()) }),
  links: z.array(z.object({ label: z.string(), url: z.string() })).describe("только официальные страницы вуза"),
  caveats: z.string().describe("что обязательно проверить на официальном сайте"),
});
export type UniProfile = z.infer<typeof UniProfileSchema>;
