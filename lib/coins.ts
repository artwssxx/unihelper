// UniCoins — внутренняя валюта: зарабатываются активностью и продвижением UniHelper,
// тратятся на Pro-функции и на действия сверх лимита Free. Все суммы — здесь, в одном месте.
// Начисляет и списывает только сервер (журнал coin_ledger), клиент лишь показывает.

export type TaskId =
  | "profile" | "telegram_bot" | "telegram_channel" | "instagram" | "tiktok" | "youtube"
  | "community_card" | "portfolio_public" | "first_mock" | "feedback";

export interface CoinTask {
  id: TaskId;
  title: string;
  hint: string;
  reward: number;
  /** auto — сервер проверяет сам; follow — переход по ссылке и подтверждение; form — форма (отзыв). */
  kind: "auto" | "follow" | "form";
  href?: string;
}

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined) ?? "";

/** Ссылки на соцсети: пусто — задание не показывается. */
export const SOCIALS = {
  instagram: env("NEXT_PUBLIC_INSTAGRAM_URL"),
  tiktok: env("NEXT_PUBLIC_TIKTOK_URL"),
  youtube: env("NEXT_PUBLIC_YOUTUBE_URL"),
  telegramChannel: env("NEXT_PUBLIC_TELEGRAM_CHANNEL"), // например, @unihelper_uz
};

export const TASKS: CoinTask[] = [
  { id: "profile", title: "Пройти оценку профиля", hint: "3 минуты и 8 вопросов", reward: 20, kind: "auto", href: "/quiz" },
  { id: "telegram_bot", title: "Подключить Telegram-бот", hint: "План на неделю и уведомления прямо в Telegram", reward: 30, kind: "auto", href: "/profile" },
  { id: "telegram_channel", title: "Подписаться на Telegram-канал UniHelper", hint: "Проверяем подписку через бота", reward: 30, kind: "auto" },
  { id: "instagram", title: "Подписаться на Instagram UniHelper", hint: "Истории поступивших и разборы профилей", reward: 20, kind: "follow" },
  { id: "tiktok", title: "Подписаться на TikTok UniHelper", hint: "Короткие советы по SAT и IELTS", reward: 20, kind: "follow" },
  { id: "youtube", title: "Подписаться на YouTube UniHelper", hint: "Разборы моков и уроки", reward: 20, kind: "follow" },
  { id: "community_card", title: "Заполнить карточку в комьюнити", hint: "Чтобы тебя нашли для проекта", reward: 10, kind: "auto", href: "/community" },
  { id: "portfolio_public", title: "Опубликовать портфолио публично", hint: "Со значком «Сделано в UniHelper»", reward: 40, kind: "auto", href: "/portfolio" },
  { id: "first_mock", title: "Пройти первый мок", hint: "SAT или IELTS, хоть в лёгком режиме", reward: 20, kind: "auto", href: "/mocks" },
  { id: "feedback", title: "Оставить отзыв о UniHelper", hint: "Что нравится и чего не хватает — от 30 символов", reward: 15, kind: "form" },
];

/** Повторяемые награды (начисляет сервер при самом действии). */
export const REPEAT = {
  checkinBase: 5,
  streakBonus: { 3: 10, 7: 30, 14: 60, 30: 150 } as Record<number, number>,
  mock: 10,
  mockPerDay: 2,
  lesson: 5,
  inviter: 100,
  invitee: 30,
  invitesPerMonth: 20,
};

export type ShopItemId = "pro_day" | "pro_week" | "hard_mock" | "writing_ai" | "essay_check" | "chat_pack" | "ai_uni_fill" | "fit_reasons" | "portfolio_pro";

export interface ShopItem {
  id: ShopItemId;
  title: string;
  hint: string;
  price: number;
  /** Сколько использований даёт покупка (для разовых открытий). */
  uses?: number;
  /** Привязка к объекту (например, причины — к одной программе). */
  perRef?: boolean;
}

export const SHOP: ShopItem[] = [
  { id: "pro_day", title: "Pro на 1 день", hint: "Все функции Pro на 24 часа", price: 150 },
  { id: "pro_week", title: "Pro на 7 дней", hint: "Выгоднее: неделя всех функций Pro", price: 800 },
  { id: "hard_mock", title: "Хард-мок", hint: "Одна попытка SAT или IELTS Reading в хард-режиме", price: 40, uses: 1 },
  { id: "writing_ai", title: "Проверка IELTS Writing", hint: "ИИ-оценка обоих заданий по 4 критериям", price: 50, uses: 1 },
  { id: "essay_check", title: "Проверка эссе сверх лимита", hint: "Одна ИИ-проверка эссе", price: 25, uses: 1 },
  { id: "chat_pack", title: "+20 сообщений AI Advisor", hint: "Когда закончился дневной лимит", price: 20, uses: 20 },
  { id: "ai_uni_fill", title: "ИИ-заполнение вуза", hint: "Черновик требований для своего вуза", price: 30, uses: 1 },
  { id: "fit_reasons", title: "Причины оценки программы", hint: "Почему такая метка и что усилить — для одной программы навсегда", price: 15, uses: 1_000_000, perRef: true },
  { id: "portfolio_pro", title: "Pro-шаблоны портфолио", hint: "Все шаблоны, свой цвет, без значка — навсегда", price: 120, uses: 1_000_000 },
];

export const shopItem = (id: string) => SHOP.find((s) => s.id === id);

export interface CoinState {
  balance: number;
  streak: number;
  checkedInToday: boolean;
  /** claimed — награда получена; ready — выполнено, можно забрать; todo — ещё не выполнено. */
  tasks: (CoinTask & { status: "claimed" | "ready" | "todo" })[];
  refCode: string;
  invited: number;
  history: { delta: number; reason: string; at: string }[];
  /** Открытые навсегда/оставшиеся разовые открытия: kind → refs (для fit_reasons) или число использований. */
  unlocks: { fitReasons: string[]; portfolioPro: boolean; credits: Partial<Record<ShopItemId, number>> };
}

export const REASON_RU: Record<string, string> = {
  checkin: "Ежедневный заход", streak: "Серия заходов", mock: "Мок пройден", lesson: "Урок пройден", invite: "Друг по приглашению",
  invited: "Регистрация по приглашению", spend: "Покупка", task: "Задание",
};
