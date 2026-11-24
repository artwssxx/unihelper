# Unihelper

Персональный ИИ-консультант по поступлению за рубеж на грант для школьников и студентов 1–2 курса из Узбекистана.
Основа — экспертная система (правила и веса по каждой программе), ИИ только объясняет и советует.

## Стек
Next.js 15 App Router, TypeScript strict, Tailwind v4, Supabase (Postgres + RLS), Claude API (@anthropic-ai/sdk), Vitest.

## Структура
- `app/` — страницы: `/` лендинг, `/quiz` анкета из 8 шагов, `/result` оценка и подборка, `/chat` ИИ-помощник
- `app/api/` — `profile`, `advice`, `chat`, `leads` (вся запись в базу — только здесь, service role)
- `lib/scoring/` — Profile Strength, Admission Fit, Funding Fit, подбор. Пороги — в `config.ts`
- `data/programs.ts` — конфиг программ и грантов (источник для `supabase/seed.sql`)
- `lib/server/` — Supabase, Telegram, Claude, лимиты (только серверный код, `server-only`)
- `lib/i18n/` — тексты интерфейса
- `supabase/migrations/` — схема и RLS

## Правила
- Никаких процентов «шансов». Две оценки — Admission Fit и Funding Fit — никогда не смешиваются в одно число.
- Жёсткие правила: полный грант — максимум «Реалистично»; «Высокое соответствие» невозможно без оценённых эссе/рекомендаций и при acceptance rate < 20%.
- Метку ставит код в `lib/scoring`, ИИ её только объясняет. Любое изменение правил — с тестом в `lib/scoring/scoring.test.ts`.
- Партнёрство вуза не влияет на метки и порядок; партнёры помечены явно; контакт уходит вузу только по кнопке и с согласием.
- ИИ не пишет эссе за ученика и не выдумывает дедлайны и суммы.
- Данные с `verifiedAt = null` показываются с плашкой «не проверено».
- Ключи только в `.env.local` и настройках Vercel. Service role — только в `lib/server`.
- Мобайл-first (375px), тексты через `lib/i18n`.

## Команды
- `npm run dev` — локально
- `npm test` — тесты логики
- `npm run seed:sql` — пересобрать `supabase/seed.sql` из `data/programs.ts`
