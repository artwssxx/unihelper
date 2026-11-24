"use client";

import ContentManager from "@/components/admin/ContentManager";

export default function AdminLessons() {
  return (
    <ContentManager
      kind="lessons"
      title="Уроки"
      subtitle="Конспект, мини-тест (ID вопросов из банка) и темы мока, по которым урок рекомендуется после попытки."
      columns={[
        { label: "Урок", render: (d) => <><div className="font-bold">{String(d.title)}</div><div className="text-xs text-muted">{String(d.courseId)}</div></> },
        { label: "Минут", render: (d) => String(d.minutes) },
        { label: "Доступ", render: (d) => (d.isPro ? "Pro" : "бесплатно") },
        { label: "Видео", render: (d) => (d.videoId ? "есть" : "нет") },
      ]}
      template={() => ({ id: "new-lesson", courseId: "sat-math", title: "", minutes: 8, domains: [], summary: [""], quiz: [], isPro: false, videoId: null })}
    />
  );
}
