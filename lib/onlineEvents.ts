// Автоподбор онлайн-ивентов: открытые источники с настоящими датами (Devpost — онлайн-хакатоны,
// Codeforces и CodeChef — соревнования по программированию) + онлайн-ивенты из ленты UniHelper.
// Разбор ответов источников и оценка под профиль — чистые функции (с тестами); сеть — в lib/server.

import type { Major, Profile } from "./types";
import { profileMajors } from "./profileConst";

export type OnlineSource = "devpost" | "codeforces" | "codechef" | "unihelper";

export interface OnlineEvent {
  id: string;
  source: OnlineSource;
  title: string;
  url: string;
  kind: "hackathon" | "contest" | "webinar" | "olympiad" | "summer_school" | "volunteering" | "club";
  startsAt: string; // ISO
  endsAt: string | null;
  majors: (Major | "any")[];
  organizer: string;
  /** Короткая подпись: «призы $10 000», «2 ч», «для начинающих». */
  note: string | null;
  beginner: boolean;
}

const iso = (ms: number) => new Date(ms).toISOString();

// ── Codeforces: https://codeforces.com/api/contest.list ──
export function parseCodeforces(raw: unknown, now = Date.now()): OnlineEvent[] {
  const list = (raw as { status?: string; result?: unknown[] })?.result;
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => c as { id: number; name: string; phase: string; startTimeSeconds?: number; durationSeconds?: number })
    .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds && c.startTimeSeconds * 1000 > now)
    .map((c) => {
      const beginner = /div\.?\s*[34]|educational/i.test(c.name);
      const h = Math.round((c.durationSeconds ?? 7200) / 360) / 10;
      return {
        id: `cf-${c.id}`, source: "codeforces" as const, title: c.name, url: `https://codeforces.com/contests/${c.id}`, kind: "contest" as const,
        startsAt: iso(c.startTimeSeconds! * 1000), endsAt: iso((c.startTimeSeconds! + (c.durationSeconds ?? 7200)) * 1000),
        majors: ["cs", "engineering", "natural_sciences", "economics"] as Major[], organizer: "Codeforces",
        note: `${h} ч${beginner ? " · для начинающих" : ""}`, beginner,
      };
    });
}

// ── CodeChef: https://www.codechef.com/api/list/contests/all ──
type CcContest = { contest_code: string; contest_name: string; contest_start_date_iso?: string; contest_start_date?: string; contest_end_date_iso?: string; contest_end_date?: string; contest_duration?: string | number };

/** Дата CodeChef: ISO с поясом или «26 Nov 2026  20:00:00» (время Индии, UTC+5:30). */
function ccDate(isoStr: string | undefined, plain: string | undefined): number {
  const a = isoStr ? Date.parse(isoStr) : NaN;
  if (!Number.isNaN(a)) return a;
  const m = plain?.match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
  const mon = m ? MONTHS[m[2].toLowerCase()] : undefined;
  if (!m || mon == null) return NaN;
  return Date.UTC(+m[3], mon, +m[1], +m[4], +m[5]) - 330 * 60_000;
}

export function parseCodechef(raw: unknown, now = Date.now()): OnlineEvent[] {
  const r = raw as { future_contests?: unknown[]; contests?: unknown[] };
  const list = Array.isArray(r?.future_contests) ? r.future_contests : Array.isArray(r?.contests) ? r.contests : null;
  if (!list) return [];
  return list
    .map((c) => c as CcContest)
    .map((c) => ({ ...c, start: ccDate(c.contest_start_date_iso, c.contest_start_date), end: ccDate(c.contest_end_date_iso, c.contest_end_date) }))
    .filter((c) => c.contest_code && c.contest_name && c.start > now)
    .map((c) => {
      const beginner = /starters/i.test(c.contest_name);
      const min = Number(c.contest_duration) || 0;
      return {
        id: `cc-${c.contest_code}`, source: "codechef" as const, title: c.contest_name, url: `https://www.codechef.com/${encodeURIComponent(c.contest_code)}`, kind: "contest" as const,
        startsAt: iso(c.start), endsAt: Number.isNaN(c.end) ? null : iso(c.end),
        majors: ["cs", "engineering", "natural_sciences"] as Major[], organizer: "CodeChef",
        note: `${min ? `${Math.round(min / 6) / 10} ч` : "онлайн"}${beginner ? " · все уровни" : ""}`, beginner,
      };
    });
}

// ── Devpost: https://devpost.com/api/hackathons?challenge_type[]=online&status[]=upcoming&status[]=open ──
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** «Nov 20 - Dec 15, 2026», «Dec 01 - 03, 2026», «Jan 5, 2027» → [начало, конец] (полдень UTC). */
export function parseDevpostDates(s: string | undefined): [string, string | null] | null {
  if (!s) return null;
  const m = s.replace(/\s+/g, " ").match(/([A-Za-z]{3})[a-z]* (\d{1,2})(?:, (\d{4}))?(?: ?[-–] ?(?:([A-Za-z]{3})[a-z]* )?(\d{1,2}), (\d{4}))?/);
  if (!m) return null;
  const endYear = Number(m[6] ?? m[3]);
  if (!endYear) return null;
  const m1 = MONTHS[m[1].toLowerCase()], m2 = m[4] ? MONTHS[m[4].toLowerCase()] : m1;
  if (m1 == null || m2 == null) return null;
  const startYear = m[3] ? Number(m[3]) : m1 > m2 ? endYear - 1 : endYear;
  const start = Date.UTC(startYear, m1, Number(m[2]), 12);
  const end = m[5] ? Date.UTC(endYear, m2, Number(m[5]), 12) : null;
  return [iso(start), end ? iso(end) : null];
}

const THEME_MAJORS: [RegExp, Major[]][] = [
  [/machine learning|\bai\b|artificial|web|mobile|blockchain|cyber|open source|developer|beginner|low.?code|databases|gaming|ar\/vr|iot/i, ["cs"]],
  [/hardware|iot|robot|energy|climate|sustainab|space|automotive/i, ["engineering"]],
  [/health|medic|life science|biotech/i, ["medicine", "natural_sciences"]],
  [/fintech|financ|e-?commerce|enterprise|productivity|startup|business/i, ["business", "economics"]],
  [/social good|education|civic|communication|humanities|government|community/i, ["ir"]],
  [/design|music|art|ux|ui/i, ["design"]],
  [/science|research|data/i, ["natural_sciences"]],
];

export function parseDevpost(raw: unknown, now = Date.now()): OnlineEvent[] {
  const list = (raw as { hackathons?: unknown[] })?.hackathons;
  if (!Array.isArray(list)) return [];
  const out: OnlineEvent[] = [];
  for (const x of list) {
    const h = x as { id: number; title: string; url: string; open_state?: string; submission_period_dates?: string; themes?: { name: string }[]; prize_amount?: string; organization_name?: string; invite_only?: boolean; displayed_location?: { location?: string } };
    if (!h.title || !h.url || h.invite_only) continue;
    if (h.displayed_location?.location && !/online/i.test(h.displayed_location.location)) continue;
    const dates = parseDevpostDates(h.submission_period_dates);
    if (!dates) continue;
    const end = dates[1] ? Date.parse(dates[1]) : Date.parse(dates[0]);
    if (end < now) continue;
    const themes = (h.themes ?? []).map((t) => t.name).join(", ");
    const majors = [...new Set(THEME_MAJORS.filter(([re]) => re.test(themes)).flatMap(([, m]) => m))];
    const prize = (h.prize_amount ?? "").replace(/<[^>]+>/g, "").trim();
    const beginner = /beginner/i.test(themes);
    out.push({
      id: `dp-${h.id}`, source: "devpost", title: h.title, url: /^https:\/\//.test(h.url) ? h.url : `https://devpost.com`, kind: "hackathon",
      startsAt: dates[0], endsAt: dates[1], majors: majors.length ? majors : ["any"], organizer: h.organization_name || "Devpost",
      note: [prize && prize !== "$0" ? `призы ${prize}` : null, beginner ? "для начинающих" : null, h.open_state === "open" ? "приём заявок открыт" : null].filter(Boolean).join(" · ") || null,
      beginner,
    });
  }
  return out;
}

// ── Подбор под профиль ──

export interface RankedEvent extends OnlineEvent {
  score: number;
  reasons: string[];
}

const MAJOR_RU: Record<Major, string> = { cs: "IT", engineering: "инженерия", business: "бизнес", economics: "экономика", medicine: "медицина", ir: "международные отношения", design: "дизайн", natural_sciences: "науки" };

/**
 * Насколько ивент подходит ученику: направления (основное важнее), сроки (ближайшие, но не завтра),
 * уровень (младшим — для начинающих), пользу для портфолио (хакатон с результатом, если активностей мало).
 */
export function rankOnlineEvents(events: OnlineEvent[], profile: Pick<Profile, "major" | "majors" | "grade" | "activitiesCount" | "bestAchievementLevel">, now = Date.now()): RankedEvent[] {
  const mine = profileMajors(profile as Profile);
  const weakActivities = profile.activitiesCount < 3 || profile.bestAchievementLevel === "none" || profile.bestAchievementLevel === "school";
  const out: RankedEvent[] = [];
  for (const e of events) {
    const reasons: string[] = [];
    let s = 0;
    const hit = mine.filter((m) => e.majors.includes(m));
    if (hit.length) {
      s += hit[0] === mine[0] ? 5 : 3;
      reasons.push(`по направлению «${MAJOR_RU[hit[0]]}»`);
    } else if (e.majors.includes("any")) {
      s += 1.5;
      reasons.push("подходит любому направлению");
    } else continue; // не по направлениям ученика — не предлагаем
    const days = (Date.parse(e.startsAt) - now) / 86_400_000;
    const ends = e.endsAt ? (Date.parse(e.endsAt) - now) / 86_400_000 : days;
    if (ends < 0) continue;
    if (days < 0) { s += 1.5; reasons.push("уже идёт — можно успеть"); }
    else if (days <= 14) { s += 2.5; reasons.push(days < 1 ? "старт сегодня" : `старт через ${Math.ceil(days)} дн.`); }
    else if (days <= 45) s += 1.5;
    else if (days > 120) s -= 1;
    if (profile.grade <= 9 && e.beginner) { s += 1.5; reasons.push("для начинающих"); }
    if (profile.grade >= 10 && e.kind === "hackathon") s += 0.5;
    if (weakActivities && (e.kind === "hackathon" || e.kind === "olympiad")) { s += 1.5; reasons.push("даст результат для портфолио"); }
    if (e.source === "unihelper") s += 1; // наша лента: запись и подтверждение участия через UniHelper
    out.push({ ...e, score: Math.round(s * 10) / 10, reasons });
  }
  // Не больше трёх подряд из одного источника — чтобы соревнования Codeforces не заслоняли хакатоны.
  out.sort((a, b) => b.score - a.score || a.startsAt.localeCompare(b.startsAt));
  const per: Record<string, number> = {};
  return out.filter((e) => (per[e.source] = (per[e.source] ?? 0) + 1) <= (e.source === "unihelper" ? 99 : 4));
}

export const SOURCE_LABEL: Record<OnlineSource, string> = { devpost: "Devpost", codeforces: "Codeforces", codechef: "CodeChef", unihelper: "UniHelper" };
