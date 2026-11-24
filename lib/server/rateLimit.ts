import "server-only";

// Простой лимитер в памяти процесса. На Vercel память не общая между инстансами,
// поэтому это защита от случайного перерасхода, а не строгий учёт.
// Для строгого учёта — таблица usage в Supabase (см. миграцию).
const buckets = new Map<string, { day: string; count: number }>();

export function takeQuota(key: string, limitPerDay: number): { ok: boolean; remaining: number } {
  const day = new Date().toISOString().slice(0, 10);
  const b = buckets.get(key);
  const cur = b && b.day === day ? b : { day, count: 0 };
  if (cur.count >= limitPerDay) return { ok: false, remaining: 0 };
  cur.count++;
  buckets.set(key, cur);
  return { ok: true, remaining: limitPerDay - cur.count };
}

export function clientKey(req: Request, id?: string | null): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return id ? `id:${id}` : `ip:${ip}`;
}
