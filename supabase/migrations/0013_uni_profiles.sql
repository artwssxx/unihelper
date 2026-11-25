-- Профили вузов из справочника 10 000+: собирает ИИ один раз, дальше отдаём всем из кеша.
-- Ключ: язык + страна + нормализованное название. Данные помечены как черновик (verified = false),
-- пока их не проверит эксперт. Доступ — только сервер (service role), RLS без политик.
create table if not exists public.uni_profiles (
  key text primary key,
  name text not null,
  country text not null,
  lang text not null default 'ru' check (lang in ('ru', 'uz', 'en')),
  data jsonb not null,
  source text not null default 'ai',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists uni_profiles_country_idx on public.uni_profiles (country);
alter table public.uni_profiles enable row level security;
