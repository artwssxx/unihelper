-- Пул тестов IELTS Reading, сгенерированных ИИ и прошедших автоматическую проверку (или проверенных человеком).
create table if not exists public.mock_reading_tests (
  id text primary key check (id ~ '^[a-z0-9]{6,16}$'),
  title text not null,
  passages jsonb not null,
  questions jsonb not null,
  status text not null default 'auto' check (status in ('auto', 'verified', 'rejected')),
  source text not null default 'ai' check (source in ('ai', 'human')),
  checks jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.mock_reading_tests enable row level security;
create index if not exists mock_reading_tests_status_idx on public.mock_reading_tests(status, created_at desc);
