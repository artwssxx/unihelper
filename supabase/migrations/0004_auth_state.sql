-- Аккаунты: состояние ученика (синхронизация между устройствами) и тариф.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_source text check (plan_source in ('test','paid')),
  plan_expires_at timestamptz,
  display_name text,
  avatar_url text,
  telegram_id bigint unique,
  telegram_username text,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state for select using (auth.uid() = user_id);
