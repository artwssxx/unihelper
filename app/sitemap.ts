import type { MetadataRoute } from "next";
import type { Lesson } from "@/lib/content/lessons";
import { publishedPosts } from "@/lib/server/blog";
import { getContent } from "@/lib/server/contentStore";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, lessons] = await Promise.all([publishedPosts(), getContent("lessons") as Promise<Lesson[]>]);
  const fixed = ["", "/blog", "/courses", "/quiz", "/demo", "/pricing"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const }));
  return [
    ...fixed,
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.id}`, lastModified: p.publishedAt, changeFrequency: "monthly" as const })),
    ...lessons.filter((l) => !l.isPro).map((l) => ({ url: `${SITE_URL}/courses/${l.id}`, changeFrequency: "monthly" as const })),
  ];
}
