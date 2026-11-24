// Ивенты. ВНИМАНИЕ: это демонстрационные примеры, а не реальные мероприятия.
// Реальные ивенты добавляют организаторы через «Разместить ивент» (после модерации).

export interface EventItem {
  id: string;
  title: string;
  type: "olympiad" | "volunteering" | "summer_school" | "hackathon" | "webinar" | "club";
  organizer: string;
  location: string;
  online: boolean;
  startsAt: string; // ISO
  tags: string[]; // специальности: cs, business, ...
  registrationMode: "external" | "unihelper";
  externalUrl?: string;
  capacity: number;
  registered: number;
  questions: string[];
  isPromoted: boolean;
  description: string;
}

const d = (days: number, h = 10) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

export const EVENTS: EventItem[] = [
  { id: "ev-hack", title: "Хакатон для школьников", type: "hackathon", organizer: "[Пример] IT-клуб школы", location: "Ташкент", online: false, startsAt: d(5), tags: ["cs", "engineering", "design"], registrationMode: "unihelper", capacity: 60, registered: 41, questions: ["Есть ли у вас команда?", "Какой язык программирования знаете?"], isPromoted: false, description: "48 часов, команды по 3–4 человека, менторы из IT-компаний. Итог — прототип и защита перед жюри." },
  { id: "ev-gks-webinar", title: "Вебинар: эссе для GKS", type: "webinar", organizer: "[Пример] Менторы Unihelper", location: "Онлайн", online: true, startsAt: d(12, 19), tags: ["any"], registrationMode: "unihelper", capacity: 50, registered: 48, questions: [], isPromoted: false, description: "Разбор структуры эссе для GKS и типичных ошибок. Вопросы в конце." },
  { id: "ev-volunteer", title: "Волонтёрство: уроки английского для младших", type: "volunteering", organizer: "[Пример] НКО «Билим»", location: "Самарканд", online: false, startsAt: d(9, 15), tags: ["any", "ir", "business"], registrationMode: "unihelper", capacity: 20, registered: 20, questions: ["Ваш уровень английского?"], isPromoted: false, description: "Два занятия в неделю с учениками 5–7 классов. Подтверждение часов от организатора." },
  { id: "ev-math", title: "Городская олимпиада по математике", type: "olympiad", organizer: "[Пример] Городской отдел образования", location: "Ташкент", online: false, startsAt: d(20, 9), tags: ["cs", "economics", "engineering", "natural_sciences"], registrationMode: "external", externalUrl: "https://example.org", capacity: 0, registered: 0, questions: [], isPromoted: false, description: "Регистрация — на сайте организатора." },
  { id: "ev-bio", title: "Летняя школа по биологии", type: "summer_school", organizer: "[Пример] Университет-партнёр", location: "Онлайн", online: true, startsAt: d(200), tags: ["medicine", "natural_sciences"], registrationMode: "external", externalUrl: "https://example.org", capacity: 0, registered: 0, questions: [], isPromoted: false, description: "Две недели лекций и лабораторных онлайн. Отбор по мотивационному письму." },
  { id: "ev-business", title: "Кейс-чемпионат для старшеклассников", type: "club", organizer: "[Пример] Бизнес-школа", location: "Ташкент", online: false, startsAt: d(30, 11), tags: ["business", "economics"], registrationMode: "unihelper", capacity: 40, registered: 12, questions: ["Название команды"], isPromoted: true, description: "Решение реального бизнес-кейса командами по 4 человека." },
];

export const TYPE_LABEL: Record<EventItem["type"], string> = {
  olympiad: "Олимпиада", volunteering: "Волонтёрство", summer_school: "Летняя школа", hackathon: "Хакатон", webinar: "Вебинар", club: "Клуб / кейс",
};

/** Релевантность: совпадение тегов со специальностью, близость даты, город. */
export function rankEvents(events: EventItem[], major: string | undefined, city: string | undefined, now = new Date()): EventItem[] {
  const score = (e: EventItem) => {
    let s = 0;
    if (major && e.tags.includes(major)) s += 3;
    if (e.tags.includes("any")) s += 1;
    if (city && e.location.toLowerCase() === city.toLowerCase()) s += 2;
    if (e.online) s += 1;
    const days = (new Date(e.startsAt).getTime() - now.getTime()) / 86_400_000;
    s += days < 14 ? 2 : days < 45 ? 1 : 0;
    return s;
  };
  return [...events].sort((a, b) => score(b) - score(a));
}
