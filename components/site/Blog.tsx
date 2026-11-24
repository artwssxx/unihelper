import type { BlogPost } from "@/lib/content/posts";

export function fmtDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function PostMeta({ p }: { p: BlogPost }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
      <span className="pill bg-primary-soft text-primary-ink">{p.category}</span>
      <span>{fmtDate(p.publishedAt)}</span>
      <span>· {p.readMinutes} мин</span>
    </div>
  );
}

// Обложки — фиксированные градиенты по теме: одинаково читаются в светлой и тёмной теме.
const TONE: Record<BlogPost["category"], string> = {
  Гранты: "linear-gradient(135deg,#1F7A3D,#3DBE7A)",
  Тесты: "linear-gradient(135deg,#2F62E8,#6E8CFF)",
  Эссе: "linear-gradient(135deg,#7B5CF0,#B9A6FF)",
  Стратегия: "linear-gradient(135deg,#D4612E,#EE7F4F)",
  "Новости UniHelper": "linear-gradient(135deg,#2F62E8,#EE7F4F)",
};

export function Cover({ p, big = false, slim = false }: { p: BlogPost; big?: boolean; slim?: boolean }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-[20px] ${big ? "min-h-[180px]" : slim ? "h-[110px] sm:h-[130px]" : "aspect-[16/7]"}`} style={{ background: TONE[p.category] }}>
      <span className="absolute bottom-3 left-4 right-4 font-[family-name:var(--font-instrument)] text-[28px] italic leading-none text-white/90 sm:text-[34px]">{p.category}</span>
    </div>
  );
}
