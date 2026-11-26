import type { Metadata } from "next";
import Link from "next/link";
import { ProfileCta, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { COURSES, type Lesson } from "@/lib/content/lessons";
import { getContent } from "@/lib/server/contentStore";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Бесплатные курсы UniHelper — SAT, IELTS и эссе",
  description: "Короткие уроки с конспектом и мини-тестом: SAT Math, Reading & Writing, IELTS Reading и эссе для грантов. Без регистрации.",
};

export default async function CoursesPage() {
  const lessons = (await getContent("lessons")) as Lesson[];
  const free = lessons.filter((l) => !l.isPro).length;
  return (
    <div className="min-h-screen">
      <SiteHeader active="/courses" />
      <main className="mx-auto max-w-[1180px] space-y-8 px-4 pt-6 sm:px-6">
        <section>
          <div className="eyebrow">КУРСЫ</div>
          <h1 data-i18n-phrase className="mt-3 text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">
            Учись <span className="serif-accent text-primary">без регистрации</span>
          </h1>
          <p className="mt-3 max-w-[660px] text-lg text-body">
            {free} бесплатных уроков: короткий конспект и мини-тест с разбором. Остальные уроки и прогресс по ним — в кабинете, в тарифе Pro.
          </p>
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          {COURSES.map((c) => {
            const ls = lessons.filter((l) => l.courseId === c.id);
            if (!ls.length) return null;
            return (
              <section key={c.id} className="card space-y-4" aria-labelledby={`c-${c.id}`}>
                <div>
                  <div className="text-xs font-extrabold tracking-[0.14em] text-muted">{c.topic.toUpperCase()}</div>
                  <h2 id={`c-${c.id}`} className="mt-1 text-2xl font-extrabold tracking-tight">{c.title}</h2>
                  <p className="mt-1.5 text-sm text-body">{c.description}</p>
                </div>
                <ol className="divide-y divide-line-3 overflow-hidden rounded-2xl border border-line">
                  {ls.map((l, i) => (
                    <li key={l.id}>
                      <Link href={`/courses/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-primary-soft">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-line-3 text-sm font-extrabold tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{l.title}</span>
                          <span className="text-xs text-muted">{l.minutes} мин · {l.quiz.length ? `${l.quiz.length} вопроса в тесте` : "конспект"}</span>
                        </span>
                        {l.isPro ? <span className="pill bg-line-3 text-muted">Pro</span> : <span className="pill bg-green-soft text-green">бесплатно</span>}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
        <ProfileCta text="Уроки подбираются по ошибкам в твоих моках. Оцени профиль — и UniHelper соберёт план подготовки по месяцам." />
      </main>
      <SiteFooter />
    </div>
  );
}
