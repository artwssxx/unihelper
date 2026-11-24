// Тарифы и что в них входит. Единый источник для интерфейса и проверок на сервере.

export type Plan = "free" | "pro";

export interface PlanLimits {
  myPrograms: number;
  fitReasons: boolean;
  satMocksPerMonth: number;
  ieltsReadingPerMonth: number;
  hardMode: boolean;
  writingAi: boolean;
  essayAiPerMonth: number;
  chatPerDay: number;
  proLessons: boolean;
  customUniversities: number;
  aiUniversityFill: boolean;
  portfolioTemplates: "basic" | "all";
  portfolioHideBadge: boolean;
  communityOpenPosts: number;
  communityOrgs: number;
}

export const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    myPrograms: 3, fitReasons: false, satMocksPerMonth: 1, ieltsReadingPerMonth: 1, hardMode: false, writingAi: false,
    essayAiPerMonth: 3, chatPerDay: 20, proLessons: false, customUniversities: 2, aiUniversityFill: false,
    portfolioTemplates: "basic", portfolioHideBadge: false, communityOpenPosts: 3, communityOrgs: 1,
  },
  pro: {
    myPrograms: 100, fitReasons: true, satMocksPerMonth: 1000, ieltsReadingPerMonth: 1000, hardMode: true, writingAi: true,
    essayAiPerMonth: 30, chatPerDay: 100, proLessons: true, customUniversities: 50, aiUniversityFill: true,
    portfolioTemplates: "all", portfolioHideBadge: true, communityOpenPosts: 20, communityOrgs: 5,
  },
};

/** Строки для сравнения тарифов на странице /pricing. */
export const FEATURE_ROWS: { label: string; free: string; pro: string }[] = [
  { label: "Profile Strength и подборка программ", free: "да", pro: "да" },
  { label: "Программ в моём списке", free: "до 3", pro: "без лимита" },
  { label: "Причины оценок и что усилить", free: "—", pro: "да" },
  { label: "Свои вузы в подборке", free: "до 2", pro: "до 50 + ИИ-заполнение требований" },
  { label: "SAT-моки", free: "1 в месяц, лёгкий режим", pro: "без лимита, хард-режим" },
  { label: "IELTS Reading", free: "1 в месяц, лёгкий режим", pro: "без лимита, хард-режим" },
  { label: "IELTS Writing с ИИ-оценкой", free: "—", pro: "да" },
  { label: "ИИ-проверка эссе", free: "3 в месяц", pro: "30 в месяц" },
  { label: "AI Advisor", free: "20 сообщений в день", pro: "100 сообщений в день" },
  { label: "Уроки", free: "вводные", pro: "все курсы" },
  { label: "Сайт-портфолио", free: "2 шаблона, значок Unihelper", pro: "все шаблоны, свои цвета, без значка" },
  { label: "Комьюнити: люди, проекты, чаты", free: "да, до 3 открытых проектов", pro: "да, до 20 открытых проектов" },
  { label: "Свои организации и клубы", free: "1", pro: "до 5" },
];
