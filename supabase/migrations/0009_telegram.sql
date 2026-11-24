-- Telegram-бот: привязка аккаунта, напоминания и уведомления о сообщениях комьюнити.
-- user_state.telegram_id уже есть (вход через Telegram); здесь — настройки и учёт рассылок.
alter table public.user_state add column if not exists tg_notify boolean not null default true;
alter table public.user_state add column if not exists tg_linked_at timestamptz;
alter table public.user_state add column if not exists tg_last_digest_at timestamptz;
-- Когда участнику чата последний раз отправили уведомление: не шлём новое, пока он не прочитал чат.
alter table public.community_chat_members add column if not exists notified_at timestamptz;
create index if not exists user_state_tg_idx on public.user_state(telegram_id) where telegram_id is not null;
