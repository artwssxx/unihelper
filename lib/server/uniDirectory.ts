import "server-only";
import WORLD from "@/data/world-universities.json";
import { getContent } from "./contentStore";
import type { Program } from "@/lib/types";

// Поиск вузов для автодополнения: каталог Unihelper (с оценками) + справочник вузов мира.
type Row = [name: string, country: string, web: string];
const ROWS = WORLD as Row[];
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9а-яё ]/gi, " ").replace(/\s+/g, " ").trim();
const INDEX = ROWS.map((r) => ({ r, n: norm(r[0]) }));

export interface UniHit {
  name: string;
  country: string;
  web: string | null;
  programId: string | null; // если вуз уже есть в каталоге Unihelper
  programName?: string;
}

export async function searchUniversities(q: string, country?: string, limit = 12): Promise<UniHit[]> {
  const nq = norm(q);
  if (nq.length < 2) return [];
  const words = nq.split(" ");
  const score = (n: string) => {
    if (n.startsWith(nq)) return 0;
    if (n.split(" ").some((w) => w.startsWith(nq))) return 1;
    if (words.every((w) => n.includes(w))) return 2;
    return -1;
  };
  const catalog = (await getContent("programs")) as Program[];
  const out: UniHit[] = [];
  const seen = new Set<string>();
  for (const p of catalog) {
    const s = score(norm(p.university));
    if (s < 0 || (country && p.country !== country)) continue;
    out.push({ name: p.university, country: p.country, web: p.url, programId: p.id, programName: p.name });
    seen.add(norm(p.university));
  }
  const hits = INDEX.map((x) => ({ x, s: score(x.n) }))
    .filter(({ x, s }) => s >= 0 && (!country || x.r[1] === country) && !seen.has(x.n))
    .sort((a, b) => a.s - b.s || a.x.n.length - b.x.n.length)
    .slice(0, limit);
  for (const { x } of hits) out.push({ name: x.r[0], country: x.r[1], web: x.r[2] || null, programId: null });
  return out.slice(0, limit);
}

// ── Каталог «Все вузы мира»: постраничный просмотр справочника с фильтром по стране ──

let FACETS: { country: string; count: number }[] | null = null;

/** Страны справочника с числом вузов (для фильтра), по убыванию. */
export function countryFacets() {
  if (!FACETS) {
    const m = new Map<string, number>();
    for (const [, c] of ROWS) m.set(c, (m.get(c) ?? 0) + 1);
    FACETS = [...m].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
  }
  return FACETS;
}

export const WORLD_TOTAL = ROWS.length;

export async function browseUniversities(o: { q: string; country?: string; page: number; size: number }) {
  const nq = norm(o.q);
  const words = nq ? nq.split(" ") : [];
  const catalog = (await getContent("programs")) as Program[];
  const inCatalog = new Map(catalog.map((p) => [norm(p.university), p]));
  const list = INDEX.filter((x) => (!o.country || x.r[1] === o.country) && words.every((w) => x.n.includes(w)));
  // Сначала — совпадение с начала названия, затем по алфавиту.
  if (nq) list.sort((a, b) => Number(!a.n.startsWith(nq)) - Number(!b.n.startsWith(nq)) || a.n.localeCompare(b.n));
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / o.size));
  const page = Math.min(Math.max(1, o.page), pages);
  const items: UniHit[] = list.slice((page - 1) * o.size, page * o.size).map(({ r, n }) => {
    const p = inCatalog.get(n);
    return { name: r[0], country: r[1], web: r[2] || null, programId: p?.id ?? null, programName: p?.name };
  });
  return { items, total, page, pages };
}
