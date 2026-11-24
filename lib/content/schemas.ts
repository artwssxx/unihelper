import { z } from "zod";
import { MAJORS } from "@/lib/profileSchema";

// Схемы контента, который редактируется в админке. Совпадают с типами в коде.

const nn = z.number().nullable();

export const programSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, "id: латиница, цифры, дефис"),
  name: z.string().min(1).max(200),
  university: z.string().min(1).max(200),
  country: z.string().regex(/^[A-Z]{2}$/, "код страны ISO2"),
  city: z.string().max(80),
  isLocal: z.boolean(),
  isPartner: z.boolean(),
  isCustom: z.boolean().optional(),
  aiDraft: z.boolean().optional(),
  majors: z.union([z.literal("any"), z.array(z.enum(MAJORS))]),
  url: z.string().url().nullable(),
  qsRank: nn,
  acceptanceRate: z.number().min(0).max(1).nullable(),
  typical: z.object({ gpa100: nn, ielts: nn, sat: nn }),
  requirements: z.object({ minIelts: nn, minGpa100: nn, satRequired: z.boolean() }),
  tuitionUsd: z.number().min(0),
  livingUsd: z.number().min(0),
  funding: z.object({
    type: z.enum(["none", "partial", "full"]),
    basis: z.enum(["need", "merit", "government", "none"]),
    needBlindIntl: z.boolean().nullable(),
    availableToUz: z.boolean(),
    note: z.string().max(400),
  }),
  weights: z.object({ essay: z.number().min(0).max(1), recommendations: z.number().min(0).max(1), interview: z.number().min(0).max(1) }),
  isFullGrant: z.boolean(),
  deadlineNote: z.string().max(300),
  verifiedAt: z.string().nullable(),
});

export const eventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  title: z.string().min(1).max(160),
  type: z.enum(["olympiad", "volunteering", "summer_school", "hackathon", "webinar", "club"]),
  organizer: z.string().max(120),
  location: z.string().max(80),
  online: z.boolean(),
  startsAt: z.string(),
  tags: z.array(z.string().max(40)).max(12),
  registrationMode: z.enum(["external", "unihelper"]),
  externalUrl: z.string().url().optional(),
  capacity: z.number().int().min(0),
  registered: z.number().int().min(0),
  questions: z.array(z.string().max(200)).max(10),
  isPromoted: z.boolean(),
  description: z.string().max(1000),
});

export const lessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  courseId: z.string().max(40),
  title: z.string().min(1).max(160),
  minutes: z.number().int().min(1).max(120),
  domains: z.array(z.string().max(80)).max(10),
  summary: z.array(z.string().max(500)).max(10),
  quiz: z.array(z.string().max(40)).max(10),
  isPro: z.boolean(),
  videoId: z.string().max(80).nullable(),
});

export const postSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,60}$/),
  title: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(400),
  category: z.enum(["Гранты", "Тесты", "Эссе", "Стратегия", "Новости UniHelper"]),
  body: z.string().min(20).max(30000),
  readMinutes: z.number().int().min(1).max(60),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  author: z.string().min(2).max(80),
  published: z.boolean(),
});

export const CONTENT_KINDS = { programs: programSchema, events: eventSchema, lessons: lessonSchema, posts: postSchema } as const;
export type ContentKind = keyof typeof CONTENT_KINDS;
