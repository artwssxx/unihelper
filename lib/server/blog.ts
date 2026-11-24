import "server-only";
import type { BlogPost } from "@/lib/content/posts";
import { getContent } from "./contentStore";

/** Опубликованные статьи, новые сверху (с учётом правок из админки). */
export async function publishedPosts(): Promise<BlogPost[]> {
  return ((await getContent("posts")) as BlogPost[]).filter((p) => p.published).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
