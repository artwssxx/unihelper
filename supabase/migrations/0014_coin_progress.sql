-- Базовые значения для монет за прогресс (максимум силы профиля, лучшие результаты моков).
-- Пишет только сервер (service role); клиент синхронизирует лишь user_state.data.
alter table public.user_state add column if not exists coin_progress jsonb not null default '{}'::jsonb;
