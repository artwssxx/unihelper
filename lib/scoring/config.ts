// Пороговые значения правил. Меняются здесь, без правки логики.
// Значения — стартовые гипотезы; эксперт пересматривает их раз в сезон.

export const STRENGTH_RULES = {
  academics: { gpa100: [75, 88, 95] }, // >= порога → уровень 1/2/3
  tests: {
    ielts: [5.5, 6.5, 7.5],
    sat: [1150, 1300, 1450],
  },
  activities: {
    // базовый уровень по высшему достижению
    byLevel: { none: 0, school: 1, city: 1, national: 2, international: 3 } as const,
    // +1 уровень, если активностей много (не выше 3)
    manyActivities: 4,
  },
} as const;

/**
 * Сила профиля 1–100: очки каждой оси по плавной шкале (линейно между опорными точками).
 * Опорные точки совпадают с порогами уровней выше: 30 → «развивающийся», 55 → «сильный», 80 → «очень сильный».
 * Итог — взвешенное среднее оценённых осей. Это не шанс поступления.
 */
export const STRENGTH_POINTS = {
  /** Границы уровней на шкале 1–100. */
  bands: [25, 50, 75] as const,
  weights: { academics: 0.28, tests: 0.26, activities: 0.2, leadership: 0.1, essays: 0.16 },
  gpa100: { x: [50, 75, 88, 95, 100], y: [5, 30, 55, 80, 100] },
  ielts: { x: [4, 5.5, 6.5, 7.5, 9], y: [10, 30, 55, 80, 100] },
  sat: { x: [800, 1150, 1300, 1450, 1600], y: [10, 30, 55, 80, 100] },
  activityBase: { none: 0, school: 30, city: 45, national: 70, international: 88 } as const,
  perActivity: 3,
  perActivityMax: 12,
  leadership: { none: 35, school: 35, city: 60, national: 82, international: 92 } as const,
  qualitative: { weak: 25, ok: 60, strong: 90 } as const,
} as const;

/** Оценки по предметам: как профильные предметы и спецпредметы сдвигают ось «Учёба». */
export const SUBJECT_RULES = {
  /** Очки оси += (профильные − средний) × coreShift, в пределах ±coreShiftMax. */
  coreShift: 0.5,
  coreShiftMax: 8,
  /** За каждый спецпредмет по направлению с оценкой ≥ strongCore100 — бонус, но не больше specialBonusMax. */
  specialBonus: 2,
  specialBonusMax: 4,
} as const;

export const FIT_RULES = {
  /** Разница с типичным профилем, которую считаем «на уровне». */
  tolerance: { gpa100: 3, ielts: 0.5, sat: 60 },
  /** «Заметно выше типичного». */
  clearlyAbove: { gpa100: 4, ielts: 0.5, sat: 80 },
  /** Ниже этого acceptance rate — высокая конкурентность. */
  competitiveBelow: 0.3,
  /** Ниже этого — всегда «Амбициозно». */
  veryCompetitiveBelow: 0.15,
  /** Ниже этого «Высокое соответствие» невозможно (жёсткое правило). */
  noHighBelow: 0.2,
  /** Суммарный вес эссе+рекомендаций+интервью, начиная с которого «решают качественные компоненты». */
  qualitativeHeavy: 1.2,
} as const;

/** Ключевые слова для связи портфолио со специальностью (ru/uz/en). */
export const MAJOR_KEYWORDS: Record<string, string[]> = {
  cs: ["информат", "программ", "код", "python", "хакатон", "hackathon", "it", "robot", "робот", "ai", "ии", "сайт", "app", "приложен", "dasturlash"],
  engineering: ["инженер", "физик", "робот", "robot", "конструк", "механ", "электрон", "arduino", "muhandis"],
  business: ["бизнес", "стартап", "startup", "предприним", "продаж", "маркетинг", "biznes", "tadbirkor"],
  economics: ["эконом", "математ", "финанс", "iqtisod", "olimpiada"],
  medicine: ["биолог", "хими", "медиц", "волонт", "больниц", "tibbiyot", "biologiya", "kimyo"],
  ir: ["mun", "дебат", "debate", "истори", "право", "международ", "xalqaro"],
  design: ["дизайн", "design", "рисун", "архитект", "фото", "art", "portfolio"],
  natural_sciences: ["физик", "хими", "биолог", "математ", "исследован", "research", "olimpiada"],
};
