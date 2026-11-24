import Link from "next/link";
import * as I from "@/components/icons";
import { Faq, Layers } from "@/components/landing/Interactive";

// Лендинг по макету unihelper-landing.html. Тексты — пока тестовые, будут меняться.

const BARS = [
  { name: "Учёба", level: "сильно", w: 82 },
  { name: "Тесты", level: "сильно", w: 76 },
  { name: "Активности", level: "средне", w: 58 },
  { name: "Лидерство", level: "средне", w: 50 },
  { name: "Эссе", level: "не оценено", w: 8 },
];

export default function Landing() {
  return (
    <div className="bg-bg text-ink">
      <div className="flex flex-wrap items-center justify-center gap-3 bg-ink px-6 py-2.5 text-sm font-semibold text-white">
        <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-bold">Новое</span>
        <span>SAT- и IELTS-моки с хард-режимом уже в Unihelper</span>
        <a href="#features" className="text-peach">Смотреть →</a>
      </div>

      <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <I.Logo size={30} />
          <span className="text-xl font-extrabold tracking-tight">UniHelper</span>
        </Link>
        <nav className="hidden gap-7 text-[15px] font-semibold text-ink-2 md:flex" aria-label="Разделы лендинга">
          <a href="#how" className="hover:text-primary-ink">Как работает</a>
          <a href="#features" className="hover:text-primary-ink">Возможности</a>
          <a href="#grants" className="hover:text-primary-ink">Гранты</a>
          <a href="#pricing" className="hover:text-primary-ink">Цены</a>
          <a href="#faq" className="hover:text-primary-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-[13px] font-bold text-muted md:inline" title="Узбекский и английский — скоро">RU · UZ · EN</span>
          <Link href="/dashboard" className="rounded-xl border border-line-2 bg-surface px-[18px] py-[11px] text-sm font-bold">Войти</Link>
          <Link href="/quiz" className="rounded-xl bg-primary px-[18px] py-[11px] text-sm font-bold text-white hover:bg-primary-ink">Начать бесплатно</Link>
        </div>
      </header>

      <section id="top" className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-14 px-6 pb-[72px] pt-14">
        <div className="min-w-0 flex-[1_1_480px]">
          <div className="eyebrow mb-5">ДЛЯ ШКОЛЬНИКОВ 9–11 КЛАССОВ</div>
          <h1 className="m-0 text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] md:text-[68px]">Поступление за&nbsp;рубеж — по&nbsp;плану, а&nbsp;не&nbsp;наугад.</h1>
          <p className="mt-6 max-w-[540px] text-[19px] leading-[1.55] text-body">
            Unihelper собирает твоё портфолио, честно показывает, каким программам и грантам ты подходишь, и ведёт по дорожной карте до отправки заявки.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/quiz" className="rounded-[14px] bg-primary px-6 py-4 text-base font-bold text-white hover:bg-primary-ink">Оценить профиль за 3 минуты</Link>
            <a href="#how" className="rounded-[14px] border border-line-2 bg-surface px-6 py-4 text-base font-bold">Как это работает</a>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-muted">
            <span>✓ Бесплатный старт</span><span>✓ Русский, скоро узбекский и английский</span><span>✓ Браузер и телефон</span>
          </div>
        </div>
        <div className="relative min-w-0 flex-[1_1_460px]">
          <div className="relative overflow-hidden rounded-[28px] bg-primary p-8 text-white shadow-[0_30px_60px_rgba(46,107,230,.25)]">
            <div className="absolute -right-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-white/[.08]" aria-hidden />
            <span className="inline-block rounded-[10px] bg-white px-3 py-1.5 text-[13px] font-extrabold text-ink">Profile Strength</span>
            <div className="mt-[22px] flex flex-wrap items-center gap-7">
              <div className="flex h-32 w-32 flex-none flex-col items-center justify-center rounded-full border-[12px] border-peach">
                <span className="text-2xl font-extrabold">Сильный</span>
                <span className="text-xs opacity-85">3 из 4 уровней</span>
              </div>
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3">
                {BARS.map((b) => (
                  <div key={b.name}>
                    <div className="flex justify-between text-[13px] font-semibold"><span>{b.name}</span><span className="opacity-85">{b.level}</span></div>
                    <div className="mt-1.5 h-[7px] rounded-full bg-white/[.22]"><div className="h-[7px] rounded-full bg-white" style={{ width: `${b.w}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lift relative -mt-7 ml-auto w-[min(360px,92%)] rounded-[20px] border border-line bg-surface p-5 shadow-[0_20px_40px_rgba(14,26,58,.10)]">
            <div className="text-xs font-bold text-muted">ПРОГРАММА</div>
            <div className="mt-1 text-[17px] font-extrabold">KAIST · Computer Science</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="pill bg-primary-soft text-primary-ink">Поступление: амбициозно</span>
              <span className="pill bg-orange-soft text-orange-ink-2">Финансирование: среднее</span>
            </div>
            <div className="mt-3 text-[13px] leading-normal text-muted">Не оценено: эссе, рекомендации</div>
          </div>
        </div>
      </section>

      <section id="grants" className="mx-auto max-w-[1240px] px-6 pb-[72px]">
        <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-surface px-7 py-6">
          <span className="flex-none text-sm font-bold text-muted">Требования и сроки внутри:</span>
          <div className="flex flex-wrap gap-2.5">
            {["Stipendium Hungaricum", "Türkiye Bursları", "GKS Korea", "MEXT Japan", "Need-based aid США", "Частные вузы Узбекистана"].map((g) => (
              <span key={g} className="rounded-xl bg-bg px-3.5 py-2 text-sm font-bold">{g}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1240px] px-6 pb-[88px] pt-10">
        <div className="eyebrow">ЧЕСТНАЯ ОЦЕНКА</div>
        <h2 className="mt-3.5 max-w-[760px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[48px]">Три оценки вместо выдуманных «шансов в процентах».</h2>
        <div className="mt-11 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          {[
            { icon: <I.Chart color="#2E6BE6" />, bg: "bg-primary-soft", title: "Profile Strength", text: "Насколько силён твой профиль сам по себе: учёба, тесты, активности, лидерство, эссе. И что прокачать в первую очередь." },
            { icon: <I.Target color="#2E6BE6" />, bg: "bg-primary-soft", title: "Admission Fit", text: "Насколько ты подходишь конкретной программе: требования, портфолио под специальность, эссе и интервью, конкурс." },
            { icon: <I.Card color="#C2501A" />, bg: "bg-orange-soft", title: "Funding Fit", text: "Отдельно — реально ли получить финансирование. Поступить и получить грант — разные задачи, и мы их не смешиваем." },
          ].map((c) => (
            <div key={c.title} className="lift rounded-3xl border border-line bg-surface p-7">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg}`}>{c.icon}</div>
              <h3 className="mt-5 text-[22px] font-extrabold">{c.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-body">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap gap-14 px-6 py-[88px]">
          <div className="min-w-0 flex-[1_1_380px]">
            <div className="eyebrow">ИЗ ЧЕГО СОСТОИТ ЗАЯВКА</div>
            <h2 className="mt-3.5 text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[44px]">Оценки решают меньше, чем кажется.</h2>
            <p className="mb-7 mt-4 text-base leading-relaxed text-body">Нажми на слой — увидишь, что в нём важно и как Unihelper помогает.</p>
            <Layers />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1240px] px-6 py-[88px]">
        <div className="eyebrow">ВСЁ В ОДНОМ МЕСТЕ</div>
        <h2 className="mb-11 mt-3.5 max-w-[720px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[48px]">От первого мока до отправленной заявки.</h2>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          <div className="lift flex min-w-0 flex-wrap items-center gap-7 rounded-[28px] bg-ink p-8 text-white md:col-span-2">
            <div className="flex-[1_1_260px]">
              <h3 className="m-0 text-[26px] font-extrabold">SAT и IELTS моки</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-navy-text">SAT Math и Reading &amp; Writing с адаптивным вторым модулем, IELTS Reading и Writing с ИИ-оценкой. Лёгкий режим — с подсказками. Хард — как на экзамене: вышел из вкладки, попытка закончена.</p>
              <Link href="/mocks" className="mt-5 inline-block font-extrabold text-peach">Попробовать мок →</Link>
            </div>
            <div className="flex-[1_1_260px] rounded-[20px] bg-navy-2 p-5">
              <div className="flex items-center justify-between text-[13px] font-bold"><span className="rounded-lg bg-orange px-2.5 py-1">Хард-режим</span><span>18:42</span></div>
              <div className="mt-3.5 text-[13px] text-navy-text">SAT Math · модуль 2 · вопрос 14 / 22</div>
              <div className="mt-2.5 h-[7px] rounded-full bg-white/15"><div className="h-[7px] w-[63%] rounded-full bg-peach" /></div>
              <div className="mt-3.5 text-[13px] text-navy-text">Примерный балл после прошлого мока</div>
              <div className="mt-1 text-[28px] font-extrabold">≈ 1180–1260</div>
            </div>
          </div>
          {[
            { t: "AI Advisor", d: "Отвечает с учётом твоего профиля, проверяет эссе и не придумывает дедлайны — только со ссылкой на официальный сайт.", href: "/assistant" },
            { t: "Дорожная карта", d: "План по месяцам от твоего класса до подачи: тесты, активности, документы, заявки.", href: "/roadmap" },
            { t: "Ивенты в один клик", d: "Олимпиады, волонтёрство, летние школы. Отметка по QR сама попадает в портфолио.", href: "/events" },
            { t: "Уроки", d: "Короткие уроки от студентов, поступивших на грант. После мока — подборка по твоим слабым темам.", href: "/lessons" },
          ].map((f) => (
            <Link key={f.t} href={f.href} className="lift rounded-[28px] border border-line bg-surface p-7">
              <h3 className="m-0 text-[22px] font-extrabold">{f.t}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-body">{f.d}</p>
            </Link>
          ))}
          <Link href="/portfolio" className="lift rounded-[28px] border border-primary-soft-2 bg-primary-soft p-7">
            <h3 className="m-0 text-[22px] font-extrabold">Сайт-портфолио</h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-body">Страница из твоего профиля за минуту. Ссылку можно приложить к заявке — контакты и оценки скрыты по умолчанию.</p>
            <div className="mt-4 text-sm font-bold text-primary-ink">unihelper.uz/p/aziz</div>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 pb-[88px]">
        <div className="grid overflow-hidden rounded-[28px] border border-line bg-surface [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {[
            ["01", "Заполни профиль", "8 вопросов: класс, оценки, тесты, активности, цели, бюджет."],
            ["02", "Получи оценки", "Profile Strength и подборка программ с двумя метками и причинами."],
            ["03", "Иди по карте", "Моки, уроки, ивенты и эссе — по шагам и в срок."],
            ["04", "Подай заявки", "Чек-листы документов по каждому вузу и напоминания до дедлайна."],
          ].map(([n, h, d]) => (
            <div key={n} className="border-b border-r border-line p-7">
              <div className="text-sm font-extrabold text-primary">{n}</div>
              <h3 className="mt-3.5 text-[19px] font-extrabold">{h}</h3>
              <p className="mt-2 text-sm leading-normal text-body">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1240px] px-6 pb-[88px]">
        <div className="eyebrow">ЦЕНЫ</div>
        <h2 className="mb-11 mt-3.5 text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[48px]">Дешевле одного часа у консультанта.</h2>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
          <Price name="Free" price="0 сум" items={["Профиль и Profile Strength", "3 программы в списке", "1 SAT-мок в месяц, лёгкий режим", "Лента ивентов"]} cta="Начать" href="/quiz" />
          <div className="flex flex-col gap-3.5 rounded-3xl bg-primary p-7 text-white shadow-[0_24px_50px_rgba(46,107,230,.25)]">
            <div className="flex items-center justify-between"><span className="font-extrabold">Pro</span><span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-primary-ink">Популярный</span></div>
            <div className="text-4xl font-extrabold tracking-tight">120 000 сум<span className="text-[15px] font-semibold opacity-85"> / мес</span></div>
            <div className="text-sm leading-[1.7] text-[#E6EDFD]">Admission Fit и Funding Fit без ограничений<br />Моки без лимита и хард-режим<br />30 проверок эссе<br />Полные видеокурсы</div>
            <Link href="/quiz" className="mt-auto rounded-xl bg-white p-[13px] text-center font-extrabold text-primary-ink">Попробовать Pro</Link>
          </div>
          <Price name="Сезон" price="550 000 сум" per="/ 6 мес" items={["Всё из Pro на весь сезон заявок", "Консультация ментора"]} cta="Выбрать" href="/quiz" />
          <Price name="Школам" price="от 30 000 сум" per="/ ученик" items={["Кабинет консультанта", "Классные пробники в хард-режиме", "Отчёты по поступлениям"]} cta="Связаться" href="#start" />
        </div>
        <p className="mt-4 text-sm text-muted">Цены — стартовые. Оплата через Click и Payme появится после беты.</p>
      </section>

      <section id="faq" className="mx-auto max-w-[880px] px-6 pb-[88px]">
        <h2 className="mb-8 text-center text-[32px] font-extrabold tracking-[-0.03em] md:text-[44px]">Частые вопросы</h2>
        <Faq />
      </section>

      <section id="start" className="mx-auto max-w-[1240px] px-6 pb-[88px]">
        <div className="relative overflow-hidden rounded-[32px] bg-primary px-10 py-16 text-center text-white">
          <div className="absolute -bottom-[120px] -left-20 h-80 w-80 rounded-full border-[40px] border-peach/35" aria-hidden />
          <h2 className="relative mx-auto max-w-[760px] text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] md:text-[48px]">Узнай за 3 минуты, какие программы и гранты тебе подходят.</h2>
          <p className="relative mx-auto mt-4 max-w-[560px] text-[17px] text-[#E6EDFD]">Бесплатно. Контакты нужны, только чтобы сохранить твой план.</p>
          <Link href="/quiz" className="relative mt-8 inline-block rounded-[14px] bg-white px-7 py-[17px] text-base font-extrabold text-primary-ink">Пройти оценку</Link>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-10 px-6 py-10 text-sm text-muted">
          <div className="flex max-w-[300px] flex-col gap-2.5">
            <span className="text-lg font-extrabold text-ink">UniHelper</span>
            <span className="leading-relaxed">Помощник по поступлению за рубеж и в частные вузы Узбекистана.</span>
          </div>
          <div className="flex flex-wrap gap-14">
            <div className="flex flex-col gap-2.5"><span className="font-extrabold text-ink">Продукт</span><a href="#features">Возможности</a><a href="#pricing">Цены</a><a href="#faq">FAQ</a></div>
            <div className="flex flex-col gap-2.5"><span className="font-extrabold text-ink">Разделы</span><Link href="/mocks">Моки</Link><Link href="/events">Ивенты</Link><Link href="/lessons">Уроки</Link></div>
          </div>
        </div>
        <div className="mx-auto max-w-[1240px] px-6 pb-8 text-[13px] text-muted">© 2026 UniHelper</div>
      </footer>
    </div>
  );
}

function Price({ name, price, per, items, cta, href }: { name: string; price: string; per?: string; items: string[]; cta: string; href: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-7">
      <div className="font-extrabold">{name}</div>
      <div className="text-4xl font-extrabold tracking-tight">{price}{per && <span className="text-[15px] font-semibold text-muted"> {per}</span>}</div>
      <div className="text-sm leading-[1.7] text-body">{items.map((i) => <div key={i}>{i}</div>)}</div>
      <Link href={href} className="mt-auto rounded-xl border border-line-2 p-[13px] text-center font-bold">{cta}</Link>
    </div>
  );
}
