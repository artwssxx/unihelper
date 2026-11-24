// Общие типы Unihelper. Логика оценки живёт в lib/scoring, данные программ — в data/programs.ts.

export type Major =
  | "cs"
  | "engineering"
  | "business"
  | "economics"
  | "medicine"
  | "ir"
  | "design"
  | "natural_sciences";

export type CountryCode =
  | "US"
  | "AE"
  | "HU"
  | "TR"
  | "KR"
  | "DE"
  | "IT"
  | "JP"
  | "UZ";

export type AchievementLevel = "none" | "school" | "city" | "national" | "international";

export type AssessmentState = "not_assessed" | "weak" | "ok" | "strong";

/** Профиль ученика — ответы анкеты из 8 шагов. */
export interface Profile {
  grade: number; // 8–11 класс, 12 = 1 курс, 13 = 2 курс
  city: string;
  gpa: number | null;
  gpaScale: 5 | 100;
  ielts: number | null;
  sat: number | null;
  achievementsText: string;
  bestAchievementLevel: AchievementLevel;
  activitiesCount: number;
  ledSomething: boolean; // инициировал/руководил проектом, клубом, командой
  targetCountries: CountryCode[];
  major: Major;
  budgetUsd: number; // сколько семья может платить в год за учёбу и жизнь, без гранта
  // Пока не оцениваются в анкете — так и показываем «не оценено».
  essays: AssessmentState;
  recommendations: AssessmentState;
  /** Баллы хард-моков (середина диапазона). Только для Profile Strength, НЕ для требований вузов. */
  mockSat?: number | null;
  mockIelts?: number | null;
}

export type FundingType = "none" | "partial" | "full";
export type FundingBasis = "need" | "merit" | "government" | "none";

/** Конфиг программы/гранта. Заполняет и раз в сезон пересматривает эксперт. */
export interface Program {
  id: string;
  name: string; // программа или грант
  university: string;
  /** ISO 3166-1 alpha-2. Каталог — 9 стран, свои вузы — любая страна. */
  country: CountryCode | (string & {});
  city: string;
  isLocal: boolean;
  isPartner: boolean;
  /** Свой вуз ученика (не из каталога): данные ученика или черновик ИИ, не проверены. */
  isCustom?: boolean;
  /** Требования заполнены ИИ (черновик). */
  aiDraft?: boolean;
  majors: Major[] | "any";
  url: string | null;
  qsRank: number | null;
  acceptanceRate: number | null; // 0..1, общий
  /** Типичный профиль поступивших (если неизвестно — null → «мало данных»). */
  typical: { gpa100: number | null; ielts: number | null; sat: number | null };
  /** Формальные требования. */
  requirements: { minIelts: number | null; minGpa100: number | null; satRequired: boolean };
  tuitionUsd: number; // в год, без гранта
  livingUsd: number; // в год, ориентировочно
  funding: {
    type: FundingType;
    basis: FundingBasis;
    /** need-blind для иностранцев (только для need-based). */
    needBlindIntl: boolean | null;
    /** Доступно ли гражданам Узбекистана. */
    availableToUz: boolean;
    note: string;
  };
  /** Вес качественных компонентов в решении, 0..1. */
  weights: { essay: number; recommendations: number; interview: number };
  /** Полный грант (GKS, Türkiye Bursları, SH, full need-based aid) — для жёстких правил. */
  isFullGrant: boolean;
  deadlineNote: string;
  /** Дата проверки экспертом. null — данные ориентировочные, не проверены. */
  verifiedAt: string | null;
}

export type FitLabel = "not_eligible" | "ambitious" | "realistic" | "high";
export type FundingLabel = "none" | "low" | "medium" | "high" | "self_funded";
export type Confidence = "low" | "medium" | "high";
export type StrengthLevel = 0 | 1 | 2 | 3; // начальный / развивающийся / сильный / очень сильный

export interface AxisResult {
  axis: "academics" | "tests" | "activities" | "leadership" | "essays";
  level: StrengthLevel | null; // null — не оценено
  note: string;
}

export interface StrengthResult {
  axes: AxisResult[];
  overall: StrengthLevel;
  tips: string[];
}

export interface FitResult {
  programId: string;
  admission: { label: FitLabel; reasons: string[]; unknown: string[]; confidence: Confidence };
  funding: { label: FundingLabel; reasons: string[] };
  isBackup: boolean;
}
