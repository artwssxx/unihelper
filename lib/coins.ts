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

export type ShopItemId = "pro_day" | "pro_week" | "hard_mock" | "writing_ai" | "essay_check" | "chat_pack" | "fit_reasons" | "portfolio_pro";

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
  { id: "fit_reasons", title: "Причины оценки программы", hint: "Почему такая метка и что усилить — для одной программы навсегда", price: 15, uses: 1_000_000, perRef: true },
  { id: "portfolio_pro", title: "Pro-шаблоны портфолио", hint: "Все шаблоны, свой цвет, без значка — навсегда", price: 120, uses: 1_000_000 },
];

export const shopItem = (id: string) => SHOP.find((s) => s.id === id);

// ——— Игра: уровни, достижения, монеты за прогресс, ежедневные задания ———

/** Уровни: опыт = все заработанные монеты за всё время (траты опыт не уменьшают). */
export const LEVELS = [
  { level: 1, xp: 0, title: "Новичок" },
  { level: 2, xp: 50, title: "Исследователь" },
  { level: 3, xp: 150, title: "Целеустремлённый" },
  { level: 4, xp: 300, title: "Стратег" },
  { level: 5, xp: 500, title: "Абитуриент" },
  { level: 6, xp: 800, title: "Претендент" },
  { level: 7, xp: 1200, title: "Финалист" },
  { level: 8, xp: 1700, title: "Стипендиат" },
  { level: 9, xp: 2400, title: "Звезда приёма" },
  { level: 10, xp: 3200, title: "Легенда UniHelper" },
] as const;
/** Бонус за достижение уровня (кроме первого). */
export const levelBonus = (level: number) => level * 10;

export function levelOf(xp: number) {
  const i = LEVELS.findLastIndex((l) => xp >= l.xp);
  const cur = LEVELS[Math.max(0, i)];
  const next = LEVELS[i + 1] ?? null;
  return { level: cur.level, title: cur.title, xp, from: cur.xp, to: next?.xp ?? null, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

/** Показатели ученика, по которым считаются достижения и награды за прогресс (сервер считает сам). */
export interface Metrics {
  mocks: number;
  bestSat: number | null;
  bestIelts: number | null;
  strength: number;
  streakMax: number;
  stepsDone: number;
  lessons: number;
  invites: number;
}

export type AchievementId =
  | "mock_1" | "mock_10" | "mock_25" | "strength_50" | "strength_75" | "streak_7" | "streak_30"
  | "steps_5" | "steps_15" | "lessons_5" | "lessons_15" | "sat_1200" | "sat_1400" | "ielts_65" | "ielts_75" | "invite_3";

export interface Achievement { id: AchievementId; title: string; hint: string; metric: keyof Metrics; target: number; reward: number }

export const ACHIEVEMENTS: Achievement[] = [
  { id: "mock_1", title: "Первый шаг", hint: "Пройди первый мок", metric: "mocks", target: 1, reward: 10 },
  { id: "mock_10", title: "Марафонец", hint: "Пройди 10 моков", metric: "mocks", target: 10, reward: 60 },
  { id: "mock_25", title: "Железная выдержка", hint: "Пройди 25 моков", metric: "mocks", target: 25, reward: 120 },
  { id: "strength_50", title: "Крепкий профиль", hint: "Сила профиля 50 из 100", metric: "strength", target: 50, reward: 40 },
  { id: "strength_75", title: "Сильный кандидат", hint: "Сила профиля 75 из 100", metric: "strength", target: 75, reward: 100 },
  { id: "streak_7", title: "Неделя в ритме", hint: "Заходи 7 дней подряд", metric: "streakMax", target: 7, reward: 30 },
  { id: "streak_30", title: "Месяц без пропусков", hint: "Заходи 30 дней подряд", metric: "streakMax", target: 30, reward: 100 },
  { id: "steps_5", title: "План в действии", hint: "Выполни 5 шагов дорожной карты", metric: "stepsDone", target: 5, reward: 30 },
  { id: "steps_15", title: "Ничего не забыто", hint: "Выполни 15 шагов дорожной карты", metric: "stepsDone", target: 15, reward: 80 },
  { id: "lessons_5", title: "Любознательный", hint: "Пройди 5 уроков", metric: "lessons", target: 5, reward: 30 },
  { id: "lessons_15", title: "Отличник", hint: "Пройди 15 уроков", metric: "lessons", target: 15, reward: 80 },
  { id: "sat_1200", title: "SAT 1200+", hint: "Набери 1200+ в моке SAT", metric: "bestSat", target: 1200, reward: 50 },
  { id: "sat_1400", title: "SAT 1400+", hint: "Набери 1400+ в моке SAT", metric: "bestSat", target: 1400, reward: 120 },
  { id: "ielts_65", title: "IELTS 6.5+", hint: "Набери 6.5+ в моке IELTS", metric: "bestIelts", target: 6.5, reward: 50 },
  { id: "ielts_75", title: "IELTS 7.5+", hint: "Набери 7.5+ в моке IELTS", metric: "bestIelts", target: 7.5, reward: 120 },
  { id: "invite_3", title: "Душа компании", hint: "Пригласи 3 друзей", metric: "invites", target: 3, reward: 60 },
];

/** Монеты за рост: новый максимум силы профиля, личный рекорд мока, выполненный шаг плана. */
export const PROGRESS = { strengthPoint: 2, personalBest: 25, satStep: 20, ieltsStep: 0.5, step: 3, stepsPerDay: 5 };

/** Ежедневные задания: выполнено, если сегодня было событие с этой причиной; все четыре — бонус. */
export const QUESTS = [
  { id: "checkin", title: "Зайти в UniHelper" },
  { id: "lesson", title: "Пройти урок" },
  { id: "mock", title: "Пройти мок" },
  { id: "step", title: "Отметить шаг дорожной карты" },
] as const;
export const DAILY_BONUS = 20;

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
  level: ReturnType<typeof levelOf>;
  achievements: (Achievement & { value: number; done: boolean })[];
  quests: { id: string; title: string; done: boolean }[];
  dailyBonus: { reward: number; done: boolean };
  /** Что начислено при этом запросе — для поздравления в интерфейсе. */
  fresh: { delta: number; reason: string }[];
}

export const REASON_RU: Record<string, string> = {
  checkin: "Ежедневный заход", streak: "Серия заходов", mock: "Мок пройден", lesson: "Урок пройден", invite: "Друг по приглашению",
  invited: "Регистрация по приглашению", spend: "Покупка", task: "Задание",
  level: "Новый уровень", ach: "Достижение", strength: "Рост силы профиля", pb: "Личный рекорд", step: "Шаг дорожной карты", daily: "Все задания дня",
};
