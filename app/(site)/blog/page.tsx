import type { Metadata } from "next";
import Link from "next/link";
import { Cover, PostMeta as Meta } from "@/components/site/Blog";
import { ProfileCta, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { publishedPosts } from "@/lib/server/blog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Блог UniHelper — гранты, SAT, IELTS и эссе",
  description: "Понятные статьи о поступлении за рубеж на грант: как устроены тесты, как писать эссе и собирать список вузов.",
};

const CATS = ["Гранты", "Тесты", "Эссе", "Стратегия", "Новости UniHelper"] as const;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const all = await publishedPosts();
  const cat = CATS.find((x) => x === c);
  const posts = cat ? all.filter((p) => p.category === cat) : all;
  const [lead, ...rest] = posts;

  return (
    <div className="min-h-screen">
      <SiteHeader active="/blog" />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 pt-6 sm:px-6">
        <section>
          <div className="eyebrow">БЛОГ</div>
          <h1 data-i18n-phrase className="mt-3 text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">
            Поступление без <span className="serif-accent text-primary">мифов</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-lg text-body">Тесты, эссе, гранты и стратегия — коротко и по делу. Суммы и сроки всегда сверяй на официальных сайтах.</p>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="Темы">
          <Link href="/blog" className="chip px-3.5 py-1.5 text-sm" data-on={!cat}>Все</Link>
          {CATS.map((x) => (
            <Link key={x} href={`/blog?c=${encodeURIComponent(x)}`} className="chip px-3.5 py-1.5 text-sm" data-on={cat === x}>{x}</Link>
          ))}
        </nav>

        {!lead ? (
          <p className="card text-body">В этой теме пока нет статей.</p>
        ) : (
          <>
            <Link href={`/blog/${lead.id}`} className="card group grid gap-5 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <Meta p={lead} />
                <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight group-hover:text-primary sm:text-[34px]">{lead.title}</h2>
                <p className="mt-3 text-body">{lead.excerpt}</p>
                <span className="mt-5 inline-block font-bold text-primary">Читать →</span>
              </div>
              <Cover p={lead} big />
            </Link>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((p) => (
                <Link key={p.id} href={`/blog/${p.id}`} className="card group flex flex-col gap-3">
                  <Cover p={p} />
                  <Meta p={p} />
                  <h2 className="text-xl font-extrabold leading-snug group-hover:text-primary">{p.title}</h2>
                  <p className="line-clamp-3 text-sm text-body">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </>
        )}
        <ProfileCta />
      </main>
      <SiteFooter />
    </div>
  );
}
