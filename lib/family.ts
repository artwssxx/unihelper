// Родители и дети: сводка прогресса ребёнка для родителя. Только итоги (сила профиля, моки, план,
// уроки, вузы, монеты) — без переписки, текстов эссе и контактов. Чистый расчёт, без сети.

import { gradesSummary, gradeText } from "./grades";
import { majorsLabel } from "./majorsLabel";
import { profileMajors } from "./profileConst";
import type { MockHistoryItem } from "./clientStore";
import { withMocks } from "./mocks/profileLink";
import { buildRoadmap, effectiveStatus } from "./roadmap";
import { FIT_LABEL_NAMES, FUNDING_LABEL_NAMES } from "./scoring/fit";
import { matchPrograms } from "./scoring/match";
import { LEVEL_NAMES, scoreProfile } from "./scoring/strength";
import type { Profile, Program } from "./types";

export type ChildData = {
  profile?: Profile | null;
  mocks?: MockHistoryItem[];
  roadmap?: Record<string, "todo" | "doing" | "done">;
  customSteps?: { id: string; title: string; month: string; track: string }[];
  lessons?: Record<string, { watched: boolean }>;
  myPrograms?: string[];
  customUnis?: Program[];
  strengthHistory?: { score: number; at: string }[];
};

export interface ChildSummary {
  linkId: string;
  status: "pending" | "active";
  name: string;
  inviteUrl: string | null;
  grade: string | null;
  city: string | null;
  majors: string | null;
  strength: { score: number; level: string } | null;
  /** Средний по предметам и профильные (если ребёнок загрузил оценки). */
  grades: { average: string; core100: number | null; weak: string[]; source: string } | null;
  strengthHistory: { score: number; at: string }[];
  mocks: { label: string; result: string; at: string; hard: boolean }[];
  roadmap: { done: number; total: number; overdue: number; next: { title: string; due: string }[] } | null;
  lessons: number;
  programs: { university: string; name: string; admission: string; funding: string }[];
  /** true — вузы из списка ребёнка; false — подходящие из подбора (своего списка нет). */
  programsMine: boolean;
  coins: { balance: number; level: number; title: string; streak: number } | null;
  lastActive: string | null;
}

const gradeLabel = (g: number) => (g <= 11 ? `${g} класс` : `${g - 11} курс`);
const MOCK_LABEL: Record<string, string> = { "sat:math": "SAT Math", "sat:rw": "SAT Reading & Writing", "ielts:reading": "IELTS Reading", "ielts:writing": "IELTS Writing" };

export function childSummary(args: {
  linkId: string;
  status: "pending" | "active";
  name: string;
  inviteUrl?: string | null;
  data: ChildData;
  programs: Program[];
  coins?: ChildSummary["coins"];
  lastActive?: string | null;
  now?: Date;
}): ChildSummary {
  const d = args.data;
  const p = d.profile ?? null;
  const now = args.now ?? new Date();
  const eff = p ? withMocks(p, d.mocks ?? []) : null;
  const strength = eff ? scoreProfile(eff) : null;

  let roadmap: ChildSummary["roadmap"] = null;
  let programs: ChildSummary["programs"] = [];
  let programsMine = false;
  if (p) {
    const items = buildRoadmap(p, d.myPrograms ?? [], now, args.programs);
    const st = items.map((i) => ({ i, s: effectiveStatus(i, d.roadmap?.[i.id], now) }));
    roadmap = {
      done: st.filter((x) => x.s === "done").length,
      total: items.length,
      overdue: st.filter((x) => x.s === "overdue").length,
      next: st.filter((x) => x.s !== "done").slice(0, 4).map((x) => ({ title: x.i.title, due: x.i.due })),
    };
    const all = matchPrograms(p, [...args.programs, ...(d.customUnis ?? [])]);
    const list = [...all.abroad, ...all.local];
    const mine = (d.myPrograms ?? []).map((id) => list.find((x) => x.program.id === id)).filter((x): x is (typeof list)[number] => Boolean(x));
    programsMine = mine.length > 0;
    // Своего списка нет — показываем подходящие (без «не соответствует»).
    programs = (programsMine ? mine : list.filter((x) => x.fit.admission.label !== "not_eligible").slice(0, 3)).slice(0, 6).map((x) => ({
      university: x.program.university,
      name: x.program.name,
      admission: FIT_LABEL_NAMES[x.fit.admission.label],
      funding: FUNDING_LABEL_NAMES[x.fit.funding.label],
    }));
  }

  const gs = p ? gradesSummary(p.grades, profileMajors(p)) : null;
  const grades: ChildSummary["grades"] = gs && p?.grades
    ? { average: gradeText(gs.average, gs.scale), core100: gs.core.average100 == null ? null : Math.round(gs.core.average100), weak: gs.weakCore.map((i) => i.subject), source: p.grades.source }
    : null;

  const mocks = [...(d.mocks ?? [])]
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
    .slice(0, 6)
    .map((m) => ({
      label: MOCK_LABEL[`${m.exam}:${m.section}`] ?? m.exam.toUpperCase(),
      result: m.band != null ? `≈ ${m.band}` : m.scoreLow != null && m.scoreHigh != null ? `≈ ${m.scoreLow}–${m.scoreHigh}` : "—",
      at: m.finishedAt,
      hard: m.mode === "hard",
    }));

  return {
    linkId: args.linkId,
    status: args.status,
    name: args.name,
    inviteUrl: args.inviteUrl ?? null,
    grade: p ? gradeLabel(p.grade) : null,
    city: p?.city || null,
    majors: p ? majorsLabel(p) : null,
    strength: strength ? { score: strength.score, level: LEVEL_NAMES[strength.overall] } : null,
    grades,
    strengthHistory: (d.strengthHistory ?? []).slice(-12),
    mocks,
    roadmap,
    lessons: Object.values(d.lessons ?? {}).filter((l) => l.watched).length,
    programs,
    programsMine,
    coins: args.coins ?? null,
    lastActive: args.lastActive ?? null,
  };
}
