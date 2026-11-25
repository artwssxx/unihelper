import { z } from "zod";

import { COUNTRIES, MAJORS, MAX_MAJORS } from "./profileConst";

// Единая схема профиля: валидирует ответы анкеты и на клиенте, и в API.
export { COUNTRIES, MAJORS };
const assessment = z.enum(["not_assessed", "weak", "ok", "strong"]);

export const profileSchema = z.object({
  grade: z.number().int().min(8).max(13),
  city: z.string().trim().min(1).max(60),
  gpa: z.number().min(0).max(100).nullable(),
  gpaScale: z.union([z.literal(5), z.literal(100)]),
  ielts: z.number().min(0).max(9).nullable(),
  sat: z.number().int().min(400).max(1600).nullable(),
  achievementsText: z.string().max(2000),
  bestAchievementLevel: z.enum(["none", "school", "city", "national", "international"]),
  activitiesCount: z.number().int().min(0).max(30),
  ledSomething: z.boolean(),
  targetCountries: z.array(z.enum(COUNTRIES)).max(COUNTRIES.length),
  major: z.enum(MAJORS),
  majors: z.array(z.enum(MAJORS)).max(MAX_MAJORS).optional(),
  majorOther: z.string().trim().max(60).optional(),
  minor: z.string().trim().max(60).optional(),
  budgetUsd: z.number().min(0).max(200000),
  essays: assessment,
  recommendations: assessment,
  mockSat: z.number().int().min(400).max(1600).nullish(),
  mockIelts: z.number().min(0).max(9).nullish(),
});

export const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

export type ContactInfo = z.infer<typeof contactSchema>;
