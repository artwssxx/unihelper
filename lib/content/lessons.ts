// Каталог уроков. Видео ментора пока нет (контент снимается неделями) — у каждого урока
// краткий конспект и мини-тест из того же банка, что и моки. videoId появится позже.

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  minutes: number;
  /** Домен/навык из моков, по которому урок рекомендуется. */
  domains: string[];
  summary: string[];
  quiz: string[]; // id вопросов из банка
  isPro: boolean;
  videoId: string | null;
}

export interface Course {
  id: string;
  title: string;
  topic: "SAT Math" | "SAT Reading & Writing" | "IELTS" | "Эссе и гранты";
  language: "ru" | "uz";
  description: string;
}

export const COURSES: Course[] = [
  { id: "sat-math", title: "SAT Math: база", topic: "SAT Math", language: "ru", description: "Алгебра, продвинутая математика, данные и геометрия — то, что чаще всего встречается в модулях." },
  { id: "sat-rw", title: "SAT Reading & Writing: стратегии", topic: "SAT Reading & Writing", language: "ru", description: "Пунктуация, переходы, слова в контексте и работа с доказательствами." },
  { id: "ielts-reading", title: "IELTS Reading без паники", topic: "IELTS", language: "ru", description: "True/False/Not Given, заголовки и заполнение пропусков." },
  { id: "essays", title: "Эссе для грантов", topic: "Эссе и гранты", language: "ru", description: "Как писать личное эссе для GKS, Türkiye Bursları и вузов США без клише." },
];

export const LESSONS: Lesson[] = [
  {
    id: "l-linear", courseId: "sat-math", title: "Линейные уравнения и системы", minutes: 8, domains: ["Algebra"], isPro: false, videoId: null,
    summary: [
      "Ищите, что спрашивают: часто не нужен x, а нужно выражение вроде 6x − 4 — умножьте всё уравнение.",
      "Систему решайте сложением, если коэффициенты удобно уравнять, и подстановкой — если переменная уже выражена.",
      "Нет решений — прямые параллельны: коэффициенты при x и y пропорциональны, а свободные члены нет.",
    ],
    quiz: ["m-lin-1", "m-system-1", "m-nosol-1"],
  },
  {
    id: "l-quadratic", courseId: "sat-math", title: "Квадратичные функции и Виета", minutes: 10, domains: ["Advanced Math"], isPro: false, videoId: null,
    summary: [
      "Сумма корней x² + bx + c = 0 равна −b, произведение равно c.",
      "Вершина параболы ax² + bx + c — в точке x = −b/(2a); при a > 0 это минимум.",
      "В композиции f(g(x)) сначала вычисляйте внутреннюю функцию.",
    ],
    quiz: ["m-quadsum-1", "m-vertex-1", "m-compose-1"],
  },
  {
    id: "l-data", courseId: "sat-math", title: "Проценты, среднее и медиана", minutes: 9, domains: ["Problem-Solving and Data Analysis"], isPro: true, videoId: null,
    summary: [
      "Последовательные изменения в процентах перемножаются: +25% и −50% дают ×1,25 × 0,5.",
      "С вопросами про среднее работайте через суммы: сумма = среднее × количество.",
      "Медиана — середина упорядоченного списка; не забудьте отсортировать.",
    ],
    quiz: ["m-percent-1", "m-mean-1", "m-median-1"],
  },
  {
    id: "l-geometry", courseId: "sat-math", title: "Геометрия: Пифагор, окружность, подобие", minutes: 9, domains: ["Geometry and Trigonometry"], isPro: true, videoId: null,
    summary: [
      "Запомните тройки 3-4-5, 5-12-13, 8-15-17, 7-24-25 и их кратные.",
      "Длина окружности 2πr, площадь πr²: из одной величины находите радиус.",
      "У подобных треугольников отношения соответствующих сторон равны.",
    ],
    quiz: ["m-pyth-1", "m-circle-1", "m-similar-2"],
  },
  {
    id: "l-punctuation", courseId: "sat-rw", title: "Пунктуация между предложениями", minutes: 7, domains: ["Standard English Conventions"], isPro: false, videoId: null,
    summary: [
      "Два независимых предложения нельзя соединить одной запятой — нужна точка с запятой, точка или запятая + союз.",
      "Двоеточие ставится после законченного предложения перед списком или пояснением.",
      "However, therefore, instead — наречия, а не союзы: перед ними в середине предложения нужна точка с запятой.",
    ],
    quiz: ["rw-004", "rw-024", "rw-045"],
  },
  {
    id: "l-transitions", courseId: "sat-rw", title: "Переходы и логика текста", minutes: 6, domains: ["Expression of Ideas"], isPro: false, videoId: null,
    summary: [
      "Сначала определите связь между предложениями: контраст, следствие, пример, добавление, последовательность.",
      "Только потом смотрите на варианты: However — контраст, Therefore — следствие, For example — пример.",
      "В Rhetorical Synthesis выбирайте вариант, который отвечает именно на цель из вопроса.",
    ],
    quiz: ["rw-005", "rw-033", "rw-049"],
  },
  {
    id: "l-context", courseId: "sat-rw", title: "Слова в контексте и структура текста", minutes: 7, domains: ["Craft and Structure"], isPro: true, videoId: null,
    summary: [
      "Предскажите слово своими словами, прежде чем читать варианты.",
      "Сигналы although, yet, far from показывают контраст — ответ противоположен соседней части.",
      "Вопрос о функции предложения — это вопрос «зачем оно здесь», а не «о чём оно».",
    ],
    quiz: ["rw-001", "rw-020", "rw-040"],
  },
  {
    id: "l-evidence", courseId: "sat-rw", title: "Доказательства и выводы", minutes: 8, domains: ["Information and Ideas"], isPro: true, videoId: null,
    summary: [
      "Правильный ответ всегда подтверждается конкретной фразой из текста.",
      "Чтобы поддержать причинную связь, нужно сравнение с контрольной группой.",
      "Остерегайтесь слишком сильных формулировок: proves, always, only.",
    ],
    quiz: ["rw-008", "rw-023", "rw-042"],
  },
  {
    id: "l-tfng", courseId: "ielts-reading", title: "True / False / Not Given", minutes: 8, domains: ["True/False/Not Given", "Yes/No/Not Given"], isPro: false, videoId: null,
    summary: [
      "FALSE — текст прямо противоречит утверждению. NOT GIVEN — текст об этом молчит.",
      "Yes/No/Not Given проверяет мнение автора, True/False/Not Given — факты.",
      "Вопросы идут в порядке текста: ищите ответ после места предыдущего.",
    ],
    quiz: ["r02", "r04", "r07"],
  },
  {
    id: "l-completion", courseId: "ielts-reading", title: "Заполнение пропусков и заголовки", minutes: 7, domains: ["Sentence completion", "Summary completion", "Matching headings"], isPro: true, videoId: null,
    summary: [
      "Соблюдайте лимит слов: NO MORE THAN TWO WORDS — значит один или два.",
      "Слово копируется из текста без изменения формы.",
      "Для заголовка абзаца читайте первое и последнее предложения.",
    ],
    quiz: ["r09", "r12", "r16"],
  },
  {
    id: "l-essay", courseId: "essays", title: "Личное эссе без клише", minutes: 12, domains: [], isPro: false, videoId: null,
    summary: [
      "Одна конкретная история лучше списка достижений: покажите, как вы думаете и что изменилось.",
      "Уберите клише: «с детства мечтал», «изменить мир», «моя страсть».",
      "Заканчивайте тем, что вы будете делать в программе — связь с грантом или вузом.",
    ],
    quiz: [],
  },
];

export function lessonsForDomains(domains: string[], limit = 3): Lesson[] {
  const out: Lesson[] = [];
  for (const d of domains) for (const l of LESSONS) if (l.domains.includes(d) && !out.includes(l)) out.push(l);
  return out.slice(0, limit);
}
