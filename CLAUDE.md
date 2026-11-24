# Unihelper

Персональный консультант по поступлению за рубеж на грант для школьников и студентов 1–2 курса из Узбекистана.
Основа — экспертная система (правила и веса по каждой программе), ИИ только объясняет и советует.
Планы: «Unihelper — план продукта и вайбкодинга» и «Unihelper — обновления v1.1 и v1.2».

## Стек
Next.js 15 App Router, TypeScript strict, Tailwind v4 (токены дизайна в `app/globals.css`), Supabase (Postgres + RLS),
ИИ через `lib/server/llm.ts` (по умолчанию бесплатный Gemini через OpenAI-совместимый API; Claude и любой OpenAI-совместимый провайдер — переменной `AI_PROVIDER`), Vitest.

## Структура
- `app/(site)` — лендинг и анкета; `app/(app)` — кабинет с боковым меню (главная, программы, карта, моки, ивенты, уроки, AI Advisor, эссе, портфолио, профиль); `app/(exam)/mocks/run` — прохождение мока без меню
- `app/api/` — `profile`, `advice`, `chat`, `leads`, `mocks/*` (start, submit, check, event, review, writing), `lessons`, `ai/essay`, `ai/portfolio`
- `lib/scoring/` — Profile Strength, Admission Fit, Funding Fit, подбор. Пороги — в `config.ts`
- `lib/mocks/` — банки вопросов (`bank/`), движок (`engine.ts`), подписанный токен попытки (`token.ts`), учёт прерываний (`attemptStore.ts`). Генерация: ID варианта `<база>~<сид base36>` — `getQuestion` восстанавливает вопрос на сервере (Math — шаблон с сидом, RW — `bank/rwGen.ts` или перемешанные варианты). IELTS Reading из пула ИИ — `lib/server/readingPool.ts` (текст → вопросы → независимое решение; сохраняются только совпавшие), перед проверкой — `ensurePoolQuestions`. Калькулятор — `lib/mocks/calc.ts` (без eval)
- `config/` — структура моков, таблицы пересчёта SAT и IELTS (калибровать вручную)
- `lib/roadmap.ts` — дорожная карта по шаблонам; `lib/content/` — уроки и ивенты
- `data/programs.ts` — программы и гранты (источник для `supabase/seed.sql`)
- `components/` — оболочка, карточки, компоненты мока, тур демо
- `app/(admin)/admin` + `app/api/admin/*` + `components/admin/*` — админка; контент = код + правки (`lib/server/contentStore.ts`), сайт читает итог через `/api/content` и `useContent()`
- `components/landing/LandingV4.tsx` + `lib/i18n/landing.ts` — лендинг на 3 языках; тема — `data-theme` на <html>, токены v4 в `app/globals.css`
- `lib/telegram/bot.ts` (логика, тесты) + `lib/server/tgBot.ts` (вызовы API) + `app/api/telegram/{webhook,link,cron}` + `app/(site)/tg` + `components/TelegramBridge.tsx` — бот и мини-приложение. Вебхук проверяет секрет, обработка — через `after()`. Мини-апп помечает вкладку `sessionStorage uh-tg`; хард-режим моков в Telegram запрещён (`inTelegram()`)
- `app/(site)/blog`, `app/(site)/courses` + `lib/content/posts.ts` + `components/site/*` — публичный блог (контент-тип `posts`, правится в `/admin/blog`) и бесплатные уроки без регистрации; текст статей — простой формат без HTML (`components/site/Prose.tsx`)
- `app/(app)/community` + `app/api/community/*` + `lib/community.ts` + `lib/server/community.ts` — комьюнити: карточки участников, проекты «ищу команду», организации с общим чатом, личные чаты (опрос раз в 4 с), жалобы → `/admin/community`, блокировки. Только для вошедших; таблицы `community_*` закрыты RLS, доступ через service role
- `app/p/[slug]` + `app/api/portfolio` + `lib/portfolio.ts` + `components/portfolio/` — публикация сайта-портфолио: в базу уходит только публичный снимок, «по ссылке» = noindex + ключ `k`, до 18 лет — согласие родителя
- `app/(site)/demo` + `lib/demo.ts` + `lib/demoData.ts` + `app/api/demo` — демо для инвесторов (вымышленный ученик, история моков считается настоящим движком)

## Правила
- Никаких процентов «шансов». Admission Fit и Funding Fit никогда не смешиваются в одно число.
- Жёсткие правила: полный грант — максимум «Реалистично»; «Высокое соответствие» невозможно без оценённых эссе/рекомендаций и при acceptance rate < 20%.
- Метку ставит код в `lib/scoring`, ИИ только объясняет. Изменение правил — с тестом.
- Моки: правильные ответы никогда не уходят на клиент до завершения модуля (`toPublic`). Балл — диапазоном с подписью «примерная оценка». Мок-балл идёт в Profile Strength «по моку» и не используется для требований вузов.
- Хард-режим: только десктоп вне Telegram, полный экран; выход/смена вкладки/blur/закрытие → попытка прервана.
- Вопросы — только свои (код/человек/ИИ + проверка). Не копировать College Board, Cambridge, Engnovate.
- Партнёрство вуза не влияет на метки и порядок; контакт уходит вузу только по кнопке и с согласием.
- ИИ не пишет эссе за ученика и не выдумывает дедлайны и суммы. Все вызовы ИИ — только через `llm()`; у каждой ИИ-функции есть запасной вариант без ИИ.
- Демо: данные явно помечены как вымышленные; в демо лиды и профиль никуда не отправляются, комьюнити и публикация портфолио недоступны.
- Комьюнити: участники — несовершеннолетние. Контакты не показываются, общение внутри сайта, перед отправкой телефона/адреса — предупреждение, у каждого сообщения/карточки/проекта — «Пожаловаться», блокировка скрывает людей друг от друга.
- Данные с `verifiedAt = null` и ивенты-примеры явно помечены.
- Ключи только в `.env.local` и настройках Vercel. Service role — только в `lib/server`.
- Новые страницы берут программы/ивенты/уроки только через `useContent()` (клиент) или `getContent()` (сервер), не из констант напрямую.
- Цвета — только токены из `globals.css` (работают в обеих темах); тёмные карточки — `bg-inv`/`inv-card`, не `bg-ink`.
- Мобайл-first (375px). Без эмодзи в интерфейсе, иконки — штриховые SVG из `components/icons.tsx`.

## Команды
- `npm run dev`, `npm test`, `npm run build`
- `npm run seed:sql` — пересобрать `supabase/seed.sql` из `data/programs.ts`
