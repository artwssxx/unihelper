import Link from "next/link";
import * as I from "@/components/icons";

// Шапка и подвал публичных страниц (блог, курсы). Без хуков — рендерится на сервере.

const NAV = [
  { href: "/blog", label: "Блог" },
  { href: "/courses", label: "Курсы" },
  { href: "/demo", label: "Демо" },
];

export function SiteHeader({ active }: { active?: "/blog" | "/courses" }) {
  return (
    <header className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <I.Logo size={30} />
        <span className="text-xl font-extrabold tracking-tight">UniHelper</span>
      </Link>
      <nav aria-label="Разделы сайта" className="flex items-center gap-1 text-sm font-bold">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active === n.href ? "page" : undefined}
            className={`rounded-full px-3 py-2 ${active === n.href ? "bg-primary-soft text-primary-ink" : "text-body hover:text-ink"}`}
          >
            {n.label}
          </Link>
        ))}
        <Link href="/quiz" className="btn-primary ml-1 hidden px-4 py-2 text-sm sm:inline-flex">
          Оценить профиль
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-[1180px] border-t border-line px-4 py-8 text-sm text-muted sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>UniHelper — поступление за рубеж на грант по плану.</span>
        <nav className="flex flex-wrap gap-4 font-bold" aria-label="Ссылки в подвале">
          <Link href="/blog" className="hover:text-ink">Блог</Link>
          <Link href="/courses" className="hover:text-ink">Курсы</Link>
          <Link href="/pricing" className="hover:text-ink">Тарифы</Link>
          <Link href="/dashboard" className="hover:text-ink">Кабинет</Link>
        </nav>
      </div>
    </footer>
  );
}

/** Карточка-призыв: бесплатная оценка профиля. */
export function ProfileCta({ text = "Узнай, куда ты проходишь и где реально получить грант, — за 3 минуты и без регистрации." }: { text?: string }) {
  return (
    <div className="rounded-[26px] bg-inv p-6 text-white sm:p-8">
      <div className="text-xs font-extrabold tracking-[0.16em] text-white/70">БЕСПЛАТНО</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight">Оцени свой профиль</div>
      <p className="mt-2 max-w-[560px] text-white/80">{text}</p>
      <Link href="/quiz" className="btn-primary mt-5 inline-flex">Начать оценку</Link>
    </div>
  );
}
