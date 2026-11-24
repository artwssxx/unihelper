"use client";

import ContentManager from "@/components/admin/ContentManager";

export default function AdminBlog() {
  return (
    <ContentManager
      kind="posts"
      title="Блог"
      subtitle="Статьи на /blog. Не указывайте точные суммы и сроки грантов без ссылки на официальный сайт: они меняются каждый год. Снимите «Опубликовано», чтобы спрятать статью."
      columns={[
        { label: "Статья", render: (d) => <><div className="font-bold">{String(d.title)}</div><div className="text-xs text-muted">/blog/{String(d.id)}</div></> },
        { label: "Тема", render: (d) => String(d.category) },
        { label: "Дата", render: (d) => String(d.publishedAt) },
        { label: "Статус", render: (d) => (d.published ? "опубликована" : "черновик") },
      ]}
      template={() => ({
        id: "new-post", title: "", excerpt: "", category: "Стратегия", readMinutes: 5,
        publishedAt: new Date().toISOString().slice(0, 10), author: "Команда UniHelper", published: false,
        body: "Первый абзац.\n\n## Подзаголовок\n\nТекст раздела.\n\n- пункт списка\n- ещё пункт",
      })}
    />
  );
}
