import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioView from "@/components/portfolio/PortfolioView";
import type { PortfolioSnapshot } from "@/lib/portfolio";
import { supabaseAdmin } from "@/lib/server/supabase";

// Публичный сайт-портфолио ученика. «По ссылке» — только с токеном и без индексации.
export const revalidate = 60;

async function load(slug: string, k?: string) {
  const db = supabaseAdmin();
  if (!db || !/^[a-z0-9-]{3,31}$/.test(slug)) return null;
  const { data } = await db.from("portfolio_sites").select("content,visibility,link_token").eq("slug", slug).maybeSingle();
  if (!data?.content) return null;
  if (data.visibility === "public") return { s: data.content as PortfolioSnapshot, index: true };
  if (data.visibility === "link" && k && k === data.link_token) return { s: data.content as PortfolioSnapshot, index: false };
  return null;
}

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const r = await load((await params).slug, (await searchParams).k);
  if (!r) return { title: "Страница не найдена", robots: { index: false } };
  return {
    title: `${r.s.name} — портфолио`,
    description: r.s.headline,
    robots: r.index ? undefined : { index: false, follow: false },
    openGraph: { title: `${r.s.name} — портфолио`, description: r.s.headline, type: "profile" },
  };
}

export default async function PublicPortfolio({ params, searchParams }: P) {
  const r = await load((await params).slug, (await searchParams).k);
  if (!r) notFound();
  return <PortfolioView s={r.s} />;
}
