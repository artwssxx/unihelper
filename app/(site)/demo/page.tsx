import Link from "next/link";
import * as I from "@/components/icons";
import StartDemoButton from "@/components/landing/StartDemoButton";

export const metadata = {
  title: "UniHelper — демо для инвесторов",
  description: "Живое демо UniHelper: оценка профиля, моки SAT и IELTS, дорожная карта и ИИ-консультант для школьников Узбекистана.",
};

// Страница для инвесторов: питч по плану продукта + запуск живого демо.
// Цифры — только из плана (цены, цели беты), без выдуманной статистики.

const BUILT = [
  ["Оценка профиля", "Profile Strength по 5 осям, Admission Fit и Funding Fit по экспертным правилам, запасной вариант"],
  ["Моки SAT и IELTS", "SAT Math и Reading & Writing с адаптивным модулем, IELTS Reading и Writing, лёгкий и хард-режим"],
  ["ИИ-консультант", "Чат с контекстом профиля, проверка эссе, оценка Writing по 4 критериям — работает вживую"],
  ["Дорожная карта", "План по месяцам до подачи: тесты, активности, документы, заявки"],
  ["Ивенты и уроки", "Запись в один клик с QR-билетом, уроки с мини-тестами по слабым темам моков"],
  ["Портфолио и лиды", "Сайт-портфолио для приёмной комиссии, заявки в частные вузы с согласием ученика"],
];

const MODEL = [
  ["Free", "0 сум", "Профиль, базовая оценка, 1 мок в месяц — воронка"],
  ["Pro", "120 000 сум / мес", "Моки без лимита, хард-режим, ИИ-проверки, полные курсы"],
  ["Сезон", "550 000 сум / 6 мес", "Pro на сезон заявок + консультация ментора"],
  ["Школы (B2B)", "от 30 000 сум / ученик / мес", "Кабинет консультанта, классные пробники, отчёты"],
  ["Частные вузы", "за лид / за зачисление", "Контакт уходит вузу только по кнопке ученика"],
  ["Менторы", "20% комиссии", "Платные звонки со студентами, поступившими на грант"],
];

export default function DemoPage() {
  return (
    <div className="bg-bg text-ink">
      <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <I.Logo size={30} />
          <span className="text-xl font-extrabold tracking-tight">UniHelper</span>
        </Link>
        <span className="pill bg-orange-soft text-orange-ink-2">Для инвесторов</span>
      </header>

      <section className="mx-auto max-w-[1240px] px-6 pb-16 pt-10">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-8 py-14 text-white md:px-14">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[40px] border-primary/40" aria-hidden />
          <div className="eyebrow relative text-peach">ЖИВОЕ ДЕМО</div>
          <h1 className="relative mt-4 max-w-[820px] text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[60px]">
            Консультант по поступлению на грант — за 120 000 сум в месяц вместо $2–5 тыс. агентству.
          </h1>
          <p className="relative mt-5 max-w-[640px] text-[18px] leading-relaxed text-navy-text">
            Школьники 9–11 классов Узбекистана получают честную оценку шансов, план до подачи, моки SAT и IELTS и ИИ-консультанта. Платит чаще родитель.
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <StartDemoButton />
            <Link href="/quiz" className="rounded-[14px] border border-navy-line px-6 py-4 text-base font-bold text-white">Пройти как новый ученик</Link>
          </div>
          <p className="relative mt-4 text-sm text-navy-text">Демо откроет кабинет вымышленного ученика с историей за 3 месяца и пошаговым туром на 10 экранов. ИИ отвечает вживую.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-5 px-6 pb-16 md:grid-cols-2">
        <div className="card p-8">
          <div className="eyebrow">ПРОБЛЕМА</div>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight">Поступить на грант сложно и дорого</h2>
          <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-body">
            <li>Информация разбросана по Telegram-каналам, дедлайны теряются.</li>
            <li>Непонятно, «хватает ли моего профиля» — и для поступления, и для гранта.</li>
            <li>Эссе некому проверить, подготовка к SAT и IELTS — отдельные платные курсы.</li>
            <li>Агентства стоят $2–5 тыс. — недоступно большинству семей.</li>
          </ul>
        </div>
        <div className="card p-8">
          <div className="eyebrow">РЕШЕНИЕ</div>
          <h2 className="mt-3 text-[28px] font-extrabold leading-tight">Экспертная система + ИИ, а не «шансы в процентах»</h2>
          <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-body">
            <li>Правила и веса по каждой программе и гранту собирают люди с опытом поступления.</li>
            <li>Две отдельные оценки: поступление и финансирование. Всегда есть запасной вариант.</li>
            <li>ИИ объясняет, проверяет и отвечает, но не ставит метки и не пишет эссе за ученика.</li>
            <li>Узбекские частные вузы и местные активности, которых нет у глобальных сервисов.</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 pb-16">
        <div className="eyebrow">УЖЕ РАБОТАЕТ</div>
        <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.03em] md:text-[44px]">Что можно потрогать прямо сейчас</h2>
        <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {BUILT.map(([t, d]) => (
            <div key={t} className="flex gap-4 rounded-3xl border border-line bg-surface p-6">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-green-soft text-green"><I.Check /></span>
              <div>
                <h3 className="font-extrabold">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-body">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="business" className="mx-auto max-w-[1240px] scroll-mt-6 px-6 pb-16">
        <div className="eyebrow">БИЗНЕС-МОДЕЛЬ</div>
        <h2 className="mt-3 text-[32px] font-extrabold tracking-[-0.03em] md:text-[44px]">Подписка, школы и вузы</h2>
        <p className="mt-3 max-w-[720px] text-body">На старте включаем подписку, остальные источники — после беты. Цены — стартовые гипотезы, проверяются в интервью с родителями.</p>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="text-sm text-muted">
              <tr><th className="px-6 py-4 font-semibold">Источник</th><th className="px-6 py-4 font-semibold">Цена</th><th className="px-6 py-4 font-semibold">Что входит</th></tr>
            </thead>
            <tbody>
              {MODEL.map(([a, b, c]) => (
                <tr key={a} className="border-t border-line-3">
                  <td className="px-6 py-4 font-extrabold">{a}</td>
                  <td className="px-6 py-4 font-bold text-primary-ink">{b}</td>
                  <td className="px-6 py-4 text-body">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card">
            <h3 className="text-lg font-extrabold">Ориентир на первый год</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-body">3 000 регистраций × 5% платящих ≈ 150 подписок + 5 школ по 100 учеников. Это иллюстрация порядка величин из плана, а не прогноз.</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-extrabold">Стоимость ИИ</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-body">MVP работает на бесплатном тарифе Google Gemini. Провайдер переключается настройкой: при росте можно перейти на платную модель с лимитами по тарифам и кэшем ответов.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-5 px-6 pb-16 md:grid-cols-2">
        <div className="card p-8">
          <div className="eyebrow">ВЫХОД НА РЫНОК</div>
          <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-body">
            <li>Telegram-канал и TikTok/Reels: истории «как я поступил на грант», разборы профилей.</li>
            <li>Бесплатная оценка профиля как вирусный крючок — картинка с результатом для сторис.</li>
            <li>Партнёрства с IELTS/SAT-центрами, вебинары в частных школах и лицеях → пилот B2B.</li>
            <li>Рефералка: привёл друга — неделя Pro обоим. Запуск перед сезоном дедлайнов.</li>
          </ul>
        </div>
        <div className="card p-8">
          <div className="eyebrow">ЦЕЛИ БЕТЫ</div>
          <p className="mt-2 text-sm text-muted">Целевые значения из плана, а не текущие результаты.</p>
          <table className="mt-3 w-full text-[15px]">
            <tbody>
              {[["Регистрация → завершённый онбординг", "≥ 60%"], ["Добавили хотя бы 1 вуз", "≥ 50%"], ["Вернулись через 7 дней", "≥ 30%"], ["Free → платный", "≥ 3–5%"], ["Школы на пилоте", "3"]].map(([k, v]) => (
                <tr key={k} className="border-t border-line-3"><td className="py-2.5 text-body">{k}</td><td className="py-2.5 text-right font-extrabold">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 pb-20">
        <div className="rounded-[32px] bg-primary px-8 py-12 text-center text-white">
          <h2 className="text-[30px] font-extrabold tracking-[-0.03em] md:text-[40px]">Посмотрите продукт изнутри</h2>
          <div className="mt-6 flex justify-center"><StartDemoButton light /></div>
          <p className="mx-auto mt-4 max-w-[620px] text-sm text-[#E6EDFD]">
            Честно о демо: ученик вымышленный, данные о вузах ориентировочные и проходят проверку экспертом, ивенты — примеры. Моки, оценки и ИИ работают по-настоящему.
          </p>
        </div>
      </section>
    </div>
  );
}
