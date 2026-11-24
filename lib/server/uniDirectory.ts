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
