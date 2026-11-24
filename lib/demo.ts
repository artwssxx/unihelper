"use client";

import { load, reset, save, type Stored } from "./clientStore";
import { saveResult, type StoredResult } from "./mocks/client";

export interface TourStep {
  path: string;
  title: string;
  text: string;
  try?: string;
}

// Тур для инвесторов: что показать на каждом экране и о чём сказать.
export const TOUR: TourStep[] = [
  { path: "/dashboard", title: "Кабинет ученика", text: "Азиз — вымышленный ученик 11 класса из Ташкента. Один экран: план на месяц, сила профиля по 5 осям, программы с двумя честными оценками, динамика мок-баллов и ивенты.", try: "Отметьте шаг в «Следующих шагах» — он сохранится в дорожной карте." },
  { path: "/programs", title: "Честная подборка", text: "Шанс на поступление и на финансирование считаются отдельно и без выдуманных процентов. В каждом списке есть запасной вариант в Узбекистане — и это первый источник выручки: частные вузы платят за лид.", try: "Нажмите «Почему такая оценка?» у любой программы." },
  { path: "/mocks", title: "Моки SAT и IELTS", text: "Свои банки вопросов: 282 задачи SAT Math проверены кодом, 57 вопросов Reading & Writing, полный тест IELTS Reading. Второй модуль SAT адаптивный. Видна динамика: с ≈ 930–1050 до текущего балла.", try: "Откройте SAT Math в хард-режиме на компьютере и попробуйте переключить вкладку." },
  { path: "/mocks/result/demo-sat-math", title: "Разбор мока", text: "Балл — диапазоном с честной подписью, точность по темам, каждая ошибка с объяснением и уроки по слабым темам. Мок превращается в план, а результат хард-режима поднимает Profile Strength." },
  { path: "/roadmap", title: "Дорожная карта", text: "План по месяцам до подачи по 4 дорожкам: тесты, активности, документы, заявки. Строится по шаблонам эксперта из класса и целей ученика, а не фантазией ИИ." },
  { path: "/events", title: "Ивенты", text: "Олимпиады, волонтёрство, хакатоны под специальность. Запись в один клик и QR-билет; участие, подтверждённое организатором, попадает в портфолио. Монетизация — продвижение коммерческих ивентов." },
  { path: "/essays", title: "ИИ-проверка эссе", text: "Работает вживую: оценки по 4 критериям, клише с цитатами и вопросы, которые углубляют текст. ИИ не пишет эссе за ученика — это принцип продукта.", try: "Нажмите «Проверить эссе» — ответ придёт за 10–30 секунд." },
  { path: "/assistant", title: "AI Advisor", text: "Чат знает профиль и подборку ученика. Не выдумывает дедлайны и суммы — отправляет на официальный сайт.", try: "Спросите: «Что мне подтянуть до весны?»" },
  { path: "/portfolio", title: "Сайт-портфолио", text: "Страница для приёмной комиссии из данных профиля: 3 шаблона, приватность по умолчанию, PDF. Внизу «Сделано в Unihelper» — бесплатный канал привлечения." },
  { path: "/demo#business", title: "Бизнес-модель", text: "Free → Pro 120 000 сум/мес, сезон, школы, лиды частных вузов. Вернитесь на страницу демо, чтобы обсудить модель и план." },
];

export async function startDemo(): Promise<void> {
  const res = await fetch("/api/demo", { cache: "no-store" });
  if (!res.ok) throw new Error("demo_failed");
  const { state, results } = (await res.json()) as { state: Stored; results: Record<string, StoredResult> };
  reset();
  for (const [id, r] of Object.entries(results)) saveResult(id, r);
  save(state);
}

export function setDemoStep(step: number) {
  const d = load().demo;
  if (d) save({ demo: { ...d, step: Math.max(0, Math.min(TOUR.length - 1, step)) } });
}

export function setTourVisible(tour: boolean) {
  const d = load().demo;
  if (d) save({ demo: { ...d, tour } });
}

export function exitDemo() {
  reset();
}
