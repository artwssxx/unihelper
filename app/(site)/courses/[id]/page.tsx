import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LessonQuiz from "@/components/lessons/LessonQuiz";
import { ProfileCta, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { COURSES, type Lesson } from "@/lib/content/lessons";
import { getContent } from "@/lib/server/contentStore";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

async function load(id: string) {
  const lessons = (await getContent("lessons")) as Lesson[];
  const lesson = lessons.find((l) => l.id === id);
  return { lessons, lesson };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { lesson } = await load(id);
  if (!lesson) return { title: "Урок не найден — UniHelper" };
  const course = COURSES.find((c) => c.id === lesson.courseId);
  return {
    title: `${lesson.title} — ${course?.title ?? "курс"} | UniHelper`,
    description: lesson.summary[0] ?? course?.description,
    alternates: { canonical: `${SITE_URL}/courses/${lesson.id}` },
  };
}

export default async function PublicLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lessons, lesson } = await load(id);
  if (!lesson) notFound();
  const course = COURSES.find((c) => c.id === lesson.courseId);
  const siblings = lessons.filter((l) => l.courseId === lesson.courseId);
  const next = siblings[siblings.findIndex((l) => l.id === lesson.id) + 1];

  return (
    <div className="min-h-screen">
      <SiteHeader active="/courses" />
      <main className="mx-auto max-w-[860px] space-y-6 px-4 pt-6 sm:px-6">
        <Link href="/courses" className="text-sm font-bold text-primary">← {course?.title ?? "Курсы"}</Link>
        <div>
          <div className="eyebrow">{course?.topic.toUpperCase()} · {lesson.minutes} МИН</div>
          <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight sm:text-[40px]">{lesson.title}</h1>
        </div>

        {lesson.isPro ? (
          <div className="card space-y-3">
            <span className="pill bg-line-3 text-muted">Урок Pro</span>
            <p className="text-body">Этот урок входит в тариф Pro: полный конспект, мини-тест с разбором и рекомендации по твоим ошибкам в моках.</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-body">
              {lesson.summary.slice(0, 1).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/pricing" className="btn-primary">Смотреть тарифы</Link>
              <Link href="/courses" className="btn-secondary">Бесплатные уроки</Link>
            </div>
          </div>
        ) : (
          <>
            <section className="card space-y-3" aria-labelledby="summary">
              <h2 id="summary" className="text-xl font-extrabold">Главное за {lesson.minutes} минут</h2>
              <ol className="space-y-3">
                {lesson.summary.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-body">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-ink">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              {!lesson.videoId && <p className="text-xs text-muted">Видео к уроку снимается. Пока — конспект и тест.</p>}
            </section>
            {lesson.quiz.length > 0 && (
              <section className="space-y-3" aria-labelledby="quiz">
                <h2 id="quiz" className="text-xl font-extrabold">Проверь себя</h2>
                <LessonQuiz lessonId={lesson.id} />
              </section>
            )}
          </>
        )}

        {next && (
          <Link href={`/courses/${next.id}`} className="card flex items-center justify-between gap-3 hover:border-primary">
            <span>
              <span className="block text-xs font-bold text-muted">СЛЕДУЮЩИЙ УРОК</span>
              <span className="font-extrabold">{next.title}</span>
            </span>
            <span className="text-primary">→</span>
          </Link>
        )}
        <ProfileCta text="Сохраняй прогресс, получай уроки по своим ошибкам в моках и план подготовки по месяцам — бесплатно." />
      </main>
      <SiteFooter />
    </div>
  );
}
