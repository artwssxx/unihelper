import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover, fmtDate, PostMeta } from "@/components/site/Blog";
import Prose, { headings } from "@/components/site/Prose";
import { ProfileCta, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { publishedPosts } from "@/lib/server/blog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await publishedPosts()).map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await publishedPosts()).find((x) => x.id === slug);
  if (!p) return { title: "Статья не найдена — UniHelper" };
  return {
    title: `${p.title} — блог UniHelper`,
    description: p.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${p.id}` },
    openGraph: { type: "article", title: p.title, description: p.excerpt, url: `${SITE_URL}/blog/${p.id}`, publishedTime: p.publishedAt, siteName: "UniHelper" },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await publishedPosts();
  const p = all.find((x) => x.id === slug);
  if (!p) notFound();
  const toc = headings(p.body);
  const more = all.filter((x) => x.id !== p.id && x.category === p.category).concat(all.filter((x) => x.id !== p.id && x.category !== p.category)).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.excerpt,
    datePublished: p.publishedAt,
    author: { "@type": "Organization", name: p.author },
    publisher: { "@type": "Organization", name: "UniHelper" },
    mainEntityOfPage: `${SITE_URL}/blog/${p.id}`,
  };

  return (
    <div className="min-h-screen">
      <SiteHeader active="/blog" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6">
        <Link href="/blog" className="text-sm font-bold text-primary">← Все статьи</Link>
        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,720px)_1fr]">
          <article className="min-w-0">
            <PostMeta p={p} />
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[46px]">{p.title}</h1>
            <p className="mt-4 text-xl leading-relaxed text-body">{p.excerpt}</p>
            <div className="mt-6"><Cover p={p} slim /></div>
            <div className="mt-8"><Prose body={p.body} /></div>
            <p className="mt-10 text-sm text-muted">{p.author} · {fmtDate(p.publishedAt)}</p>
          </article>
          <aside className="hidden space-y-5 lg:block">
            {toc.length > 1 && (
              <nav className="card sticky top-6" aria-label="Содержание статьи">
                <div className="text-xs font-extrabold tracking-[0.14em] text-muted">СОДЕРЖАНИЕ</div>
                <ol className="mt-3 space-y-2 text-sm">
                  {toc.map((h) => (
                    <li key={h.id}><a href={`#${h.id}`} className="font-semibold text-body hover:text-primary">{h.text}</a></li>
                  ))}
                </ol>
              </nav>
            )}
          </aside>
        </div>
        <div className="mt-12 max-w-[720px]"><ProfileCta /></div>
        {more.length > 0 && (
          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight">Ещё почитать</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {more.map((x) => (
                <Link key={x.id} href={`/blog/${x.id}`} className="card group flex flex-col gap-2">
                  <PostMeta p={x} />
                  <h3 className="text-lg font-extrabold leading-snug group-hover:text-primary">{x.title}</h3>
                  <p className="line-clamp-2 text-sm text-body">{x.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
