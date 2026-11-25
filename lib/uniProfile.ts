// Профиль вуза из справочника 10 000+: полная карточка (обзор, рейтинги, стоимость, требования,
// стипендии, сроки, как подавать) и перевод в программу для оценки. Данные — черновик ИИ из общего кеша,
// пока их не проверил эксперт: в интерфейсе всегда помечены «собрано ИИ, сверьте на официальном сайте».

import type { UniProfile } from "./uniProfileSchema";
import type { Major, Program } from "./types";

export type { UniProfile };
export type UniRef = { name: string; country: string; web: string | null };
export type UniProfileResponse = { profile: UniProfile; cached: boolean; updatedAt: string };

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "uni";
export const uniKey = (lang: string, country: string, name: string) => `${lang}:${country.toUpperCase()}:${slug(name)}`;

/** Ссылка безопасна для показа: только https/http. */
export const safeLink = (u: string | null | undefined) => (u && /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(u) ? u : null);

/** Профиль → программа для оценки (свой вуз, черновик ИИ, не проверено). */
export function programFromProfile(ref: UniRef, p: UniProfile, fallbackMajor: Major): Program {
  const deadline = p.deadlines.slice(0, 2).map((d) => `${d.round}: ${d.date}`).join("; ");
  return {
    id: `custom-${slug(ref.name).slice(0, 24)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Бакалавриат",
    university: ref.name,
    country: ref.country,
    city: p.city ?? "",
    isLocal: ref.country === "UZ",
    isPartner: false,
    isCustom: true,
    aiDraft: true,
    majors: p.majorsOffered.length ? p.majorsOffered : [fallbackMajor],
    url: safeLink(p.website) ?? ref.web,
    qsRank: p.qsRank,
    acceptanceRate: p.acceptanceRate != null && p.acceptanceRate > 0 && p.acceptanceRate <= 1 ? p.acceptanceRate : null,
    typical: { gpa100: p.typical.gpa100, ielts: p.typical.ielts, sat: p.typical.sat },
    requirements: { minIelts: p.requirements.minIelts, minGpa100: p.requirements.minGpa100, satRequired: p.requirements.satPolicy === "required" },
    tuitionUsd: p.tuitionUsd ?? (ref.country === "UZ" ? 3000 : 15000),
    livingUsd: p.livingUsd ?? (ref.country === "UZ" ? 2500 : 10000),
    funding: { type: p.funding.type, basis: p.funding.basis, needBlindIntl: p.funding.needBlindIntl, availableToUz: p.scholarships.every((s) => s.forUzbekistan !== false), note: p.funding.note.slice(0, 300) },
    weights: { essay: p.requirements.documents.some((d) => /эссе|essay|esse/i.test(d)) ? 0.3 : 0.15, recommendations: 0.2, interview: p.requirements.documents.some((d) => /интервью|interview|intervyu/i.test(d)) ? 0.2 : 0 },
    isFullGrant: p.funding.type === "full",
    deadlineNote: (deadline || "сверить на официальном сайте").slice(0, 290),
    verifiedAt: null,
  };
}
