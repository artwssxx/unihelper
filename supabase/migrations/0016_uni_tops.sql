-- Подбор из общей базы: список вузов страны, которые ищут иностранцы (с английскими программами и
-- стипендиями). Собирает ИИ один раз на страну (или берётся из data/uniSeeds.ts), дальше по нему
-- постепенно собираются карточки uni_profiles. Доступ — только сервер (service role), RLS без политик.
create table if not exists public.uni_country_tops (
  country text primary key,
  names jsonb not null,
  source text not null default 'ai',
  updated_at timestamptz not null default now()
);
alter table public.uni_country_tops enable row level security;
