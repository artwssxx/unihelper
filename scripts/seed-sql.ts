// Генерирует supabase/seed.sql из data/programs.ts: npm run seed:sql
import { writeFileSync } from "node:fs";
import { PROGRAMS } from "../data/programs";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const rows = PROGRAMS.map((p) =>
  `(${[p.id, p.name, p.university, p.country, p.city, p.isLocal, p.isPartner, p.majors === "any" ? null : p.majors, p.url, p.qsRank, p.acceptanceRate, p.typical, p.requirements, p.tuitionUsd, p.livingUsd, p.funding, p.weights, p.isFullGrant, p.deadlineNote, p.verifiedAt].map(q).join(", ")})`,
);

const sql = `-- Сгенерировано scripts/seed-sql.ts. Не редактировать вручную.
insert into public.programs (id, name, university, country, city, is_local, is_partner, majors, url, qs_rank, acceptance_rate, typical, requirements, tuition_usd, living_usd, funding, weights, is_full_grant, deadline_note, verified_at)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name, university = excluded.university, country = excluded.country, city = excluded.city,
  is_local = excluded.is_local, majors = excluded.majors, url = excluded.url, qs_rank = excluded.qs_rank,
  acceptance_rate = excluded.acceptance_rate, typical = excluded.typical, requirements = excluded.requirements,
  tuition_usd = excluded.tuition_usd, living_usd = excluded.living_usd, funding = excluded.funding,
  weights = excluded.weights, is_full_grant = excluded.is_full_grant, deadline_note = excluded.deadline_note,
  updated_at = now();
`;
writeFileSync("supabase/seed.sql", sql);
console.log(`supabase/seed.sql: ${PROGRAMS.length} программ`);
