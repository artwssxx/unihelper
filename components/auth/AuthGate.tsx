"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginCard from "@/components/auth/LoginCard";
import * as I from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/clientStore";

// Кабинет и моки — только после регистрации, а регистрация начинается с анкеты:
// анкета → вход (Telegram, Google или почта) → кабинет. Без входа доступны демо и сама анкета.
// Вошёл, но анкеты нет (вход со страницы /login) — отправляем на анкету.
// Пока сессия не проверена (и в HTML с сервера), экран входа виден только тем, у кого в браузере
// нет ни сессии, ни демо: флаги data-auth / data-demo ставит скрипт в <head>, прячет CSS.

const PUBLIC = ["/pricing"];
/** Для вошедших без анкеты: кабинет родителя. */
const PARENT = "/parent";

const ABOUT: { prefix: string; title: string; text: string }[] = [
  { prefix: "/dashboard", title: "Главная", text: "Сила профиля из 100, ближайшие шаги плана, подборка вузов и ивенты — на одном экране." },
  { prefix: "/programs", title: "Подбор вузов и грантов", text: "Каталог программ с двумя отдельными оценками — поступление и финансирование — и 10 000+ вузов мира." },
  { prefix: "/roadmap", title: "Дорожная карта", text: "План до поступления по месяцам: тесты, активности, документы и заявки — по твоему классу и целям." },
  { prefix: "/mocks/run", title: "Мок-экзамен", text: "Мок SAT или IELTS в лёгком или хард-режиме — результат и разбор сохранятся в аккаунте." },
  { prefix: "/mocks", title: "Моки SAT и IELTS", text: "Адаптивные моки SAT и IELTS Reading/Writing, каждый раз новые вопросы, разбор ошибок и динамика." },
  { prefix: "/events", title: "Ивенты", text: "Олимпиады, волонтёрство и летние школы под твою специальность и город." },
  { prefix: "/lessons", title: "Уроки", text: "Короткие уроки по слабым темам из моков с мини-тестами." },
  { prefix: "/community", title: "Комьюнити", text: "Команды для проектов и олимпиад, организации и чаты — безопасно, внутри сайта." },
  { prefix: "/assistant", title: "AI Advisor", text: "Чат-консультант по вузам, грантам и эссе с учётом твоего профиля. Не выдумывает дедлайны и суммы." },
  { prefix: "/essays", title: "Проверка эссе", text: "ИИ оценивает структуру, личный голос и язык, находит клише — но не пишет эссе за тебя." },
  { prefix: "/portfolio", title: "Сайт-портфолио", text: "Страница для приёмной комиссии: шаблоны, свои блоки, публикация по ссылке." },
  { prefix: "/coins", title: "UniCoins", text: "Монеты за серию заходов и задания — на Pro-функции и разовые открытия." },
  { prefix: "/profile", title: "Профиль", text: "Анкета, аккаунт, Telegram-уведомления и данные." },
  { prefix: "/parent", title: "Для родителей", text: "Прогресс ребёнка: сила профиля, моки, план поступления, уроки и подобранные вузы. Ребёнок сам решает, кого подключить." },
];

/** framed — для страниц без оболочки кабинета (мок): экран входа с полями. */
export default function AuthGate({ children, framed = false }: { children: React.ReactNode; framed?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { ready, enabled, user, stateReady } = useAuth();
  const store = useStore();
  const open = !enabled || Boolean(store?.demo?.active) || PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  const parentPage = path === PARENT || path.startsWith(PARENT + "/");
  const needQuiz = !open && !parentPage && Boolean(user) && stateReady && Boolean(store) && !store?.profile;
  // Родителю анкета ученика не нужна — его кабинет /parent.
  const target = store?.role === "parent" ? PARENT : `/quiz?next=${encodeURIComponent(path)}`;

  useEffect(() => {
    if (needQuiz) router.replace(target);
  }, [needQuiz, target, router]);

  if (open || (user && (store?.profile || parentPage))) return <>{children}</>;
  if (user) return <Waiting text={needQuiz ? (store?.role === "parent" ? "Открываем кабинет родителя…" : "Сначала анкета — открываем…") : "Загружаем твой профиль…"} />;
  const screen = framed ? <div className="px-4 py-8 sm:px-8 sm:py-14"><LoginScreen path={path} /></div> : <LoginScreen path={path} />;
  if (!ready || !store) return <div data-guest="auth">{screen}</div>;
  return screen;
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="text-sm font-semibold text-muted">{text}</span>
    </div>
  );
}

function LoginScreen({ path }: { path: string }) {
  const about = ABOUT.find((a) => path === a.prefix || path.startsWith(a.prefix + "/"));
  return (
    <div className="mx-auto grid max-w-[1040px] items-start gap-6 lg:grid-cols-[1fr_440px]">
      <section className="space-y-5 pt-2">
        <div className="eyebrow">{about ? about.title.toUpperCase() : "UNIHELPER"}</div>
        <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-tight sm:text-[42px]">
          Войди или <span className="serif-accent text-primary">зарегистрируйся</span>
        </h1>
        <p className="max-w-[560px] text-body">{about?.text ?? "Профиль, подбор вузов, моки, план и AI Advisor — в одном кабинете."} Кабинет доступен после регистрации: всё сохраняется в аккаунте и открывается с любого устройства.</p>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {[
            [I.Target, "Сила профиля из 100 — не шанс поступления, а честная шкала"],
            [I.ListIcon, "Подбор программ: поступление и финансирование отдельно"],
            [I.Timer, "Моки SAT и IELTS — каждый раз новые вопросы"],
            [I.MapIcon, "План по месяцам до подачи заявок"],
          ].map(([Icon, text], i) => {
            const Ic = Icon as typeof I.Target;
            return (
              <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5 text-sm">
                <Ic size={18} className="mt-0.5 flex-none text-primary" />
                <span>{text as string}</span>
              </li>
            );
          })}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="font-extrabold">Нет аккаунта?</div>
            <p className="mt-1 text-sm text-body">Войди через Telegram, Google или почту — аккаунт создастся сам. Потом анкета: 8 вопросов, 3 минуты.</p>
            <Link href={`/quiz?next=${encodeURIComponent(path)}`} className="btn-primary mt-3">Зарегистрироваться</Link>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 sm:col-span-2">
            <div className="font-extrabold">Я родитель</div>
            <p className="mt-1 text-sm text-body">Зарегистрируйте ребёнка или подключите его аккаунт и следите за прогрессом. Анкета родителю не нужна.</p>
            <Link href="/parent" className="btn-secondary mt-3">Кабинет родителя</Link>
          </div>
          <div className="rounded-2xl border border-dashed border-line-2 bg-surface p-4">
            <div className="font-extrabold">Просто посмотреть</div>
            <p className="mt-1 text-sm text-body">Демо: вымышленный ученик, кабинет работает как настоящий. Данные демо никуда не отправляются.</p>
            <Link href="/demo" className="btn-secondary mt-3">Открыть демо</Link>
          </div>
        </div>
      </section>
      {/* На телефоне форма входа — первой, пояснения ниже */}
      <div className="order-first lg:order-none">
        <LoginCard next={path} signupHint={false} />
      </div>
    </div>
  );
}
