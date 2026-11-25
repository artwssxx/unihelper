-- Родители и дети. Доступ родителя к прогрессу ребёнка — только с согласия ребёнка:
-- ребёнок сам даёт код (parent_code) или принимает приглашение (invite_code). Ребёнок может отключить родителя.
-- Пока ребёнок не принял приглашение, родитель видит только анкету, которую заполнил сам (child_profile).
create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references auth.users(id) on delete cascade,
  child_name text not null check (char_length(child_name) between 1 and 60),
  child_profile jsonb,
  invite_code text unique,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists parent_links_pair on public.parent_links (parent_id, child_id) where child_id is not null;
create index if not exists parent_links_child on public.parent_links (child_id);
alter table public.parent_links enable row level security;

-- Код ребёнка для родителей (6 символов), выдаётся по запросу ребёнка.
alter table public.user_state add column if not exists parent_code text unique;
