-- Вузы, которые ученики предложили добавить в общий каталог (проверяет эксперт в админке).
create table if not exists public.uni_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.uni_suggestions enable row level security;
create index if not exists uni_suggestions_status_idx on public.uni_suggestions(status, created_at desc);
