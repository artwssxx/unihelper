-- Правки контента из админки (программы, ивенты, уроки) поверх значений из кода.
create table if not exists public.content_items (
  kind text not null check (kind in ('programs','events','lessons')),
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
-- Пишет и читает только сервер (service role).
alter table public.content_items enable row level security;
