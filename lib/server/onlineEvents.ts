import "server-only";
import type { EventItem } from "@/lib/content/events";
import { parseCodechef, parseCodeforces, parseDevpost, type OnlineEvent, type OnlineSource } from "@/lib/onlineEvents";
import { getContent } from "./contentStore";

// Онлайн-ивенты из открытых источников (даты и ссылки — от организаторов, не от ИИ) + онлайн-ивенты ленты.
// Ответы источников кешируются на 3 часа (кеш fetch в Next) и в памяти процесса.

const UA = "UniHelper/1.0 (education events for school students)";
const SOURCES: { id: Exclude<OnlineSource, "unihelper">; url: string; parse: (raw: unknown) => OnlineEvent[] }[] = [
  { id: "devpost", url: "https://devpost.com/api/hackathons?challenge_type[]=online&status[]=upcoming&status[]=open&order_by=deadline&per_page=40", parse: parseDevpost },
  { id: "codeforces", url: "https://codeforces.com/api/contest.list?gym=false", parse: parseCodeforces },
  { id: "codechef", url: "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all", parse: parseCodechef },
];

let memo: { at: number; items: OnlineEvent[]; status: Record<string, string> } | null = null;

async function fetchSource(s: (typeof SOURCES)[number]): Promise<{ items: OnlineEvent[]; status: string }> {
  try {
    const r = await fetch(s.url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(9000), next: { revalidate: 10_800 } });
    if (!r.ok) return { items: [], status: `HTTP ${r.status}` };
    const items = s.parse(await r.json());
    return { items, status: `ok (${items.length})` };
  } catch (e) {
    return { items: [], status: (e as Error).name === "TimeoutError" ? "timeout" : "error" };
  }
}

export async function onlineEvents(): Promise<{ items: OnlineEvent[]; status: Record<string, string> }> {
  if (memo && Date.now() - memo.at < 30 * 60_000) return { items: memo.items, status: memo.status };
  const [results, feed] = await Promise.all([Promise.all(SOURCES.map(fetchSource)), getContent("events") as Promise<EventItem[]>]);
  const now = Date.now();
  // Онлайн-ивенты из нашей ленты (их добавляет команда или организаторы после модерации).
  const own: OnlineEvent[] = feed
    .filter((e) => e.online && Date.parse(e.startsAt) > now - 86_400_000)
    .map((e) => ({
      id: `uh-${e.id}`, source: "unihelper", title: e.title, url: `/events#${e.id}`, kind: e.type === "club" ? "club" : e.type === "webinar" ? "webinar" : e.type,
      startsAt: e.startsAt, endsAt: null, majors: e.tags.includes("any") || !e.tags.length ? ["any"] : (e.tags as OnlineEvent["majors"]),
      organizer: e.organizer, note: e.registrationMode === "unihelper" ? "запись через UniHelper" : null, beginner: true,
    }));
  const status: Record<string, string> = Object.fromEntries(SOURCES.map((s, i) => [s.id, results[i].status]));
  status.unihelper = `ok (${own.length})`;
  const items = [...own, ...results.flatMap((r) => r.items)];
  // Пустой ответ всех внешних источников не кешируем надолго — вдруг это сбой.
  memo = { at: results.some((r) => r.items.length) ? now : now - 25 * 60_000, items, status };
  return { items, status };
}
