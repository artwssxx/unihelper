-- Unihelper MVP: profiles, programs, leads, usage.
-- В MVP нет входа: все записи делает сервер (service role) через app/api/*.
-- RLS включён везде; анонимный клиент может только читать программы.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null, -- заполнится, когда появится вход (magic link / Telegram)
  full_name text not null,
  phone text not null,
  email text,
  telegram_id bigint,
  role text not null default 'student' check (role in ('student','parent','school_admin','admin')),
  grade smallint check (grade between 8 and 13),
  city text,
  gpa numeric,
  gpa_scale smallint check (gpa_scale in (5,100)),
  ielts numeric check (ielts between 0 and 9),
  sat smallint check (sat between 400 and 1600),
  achievements_text text,
  best_achievement_level text check (best_achievement_level in ('none','school','city','national','international')),
  activities_count smallint default 0,
  led_something boolean default false,
  target_countries text[] default '{}',
  target_major text,
  budget_usd integer,
  language text default 'ru' check (language in ('uz','ru','en')),
  plan text not null default 'free' check (plan in ('free','pro')),
  plan_expires_at timestamptz,
  parent_consent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Конфиг программ и грантов. Заполняет эксперт; id совпадает с data/programs.ts.
create table if not exists public.programs (
  id text primary key,
  name text not null,
  university text not null,
  country text not null,
  city text,
  is_local boolean not null default false,
  is_partner boolean not null default false,
  lead_price_uzs integer,
  contact_email text,
  majors text[],                 -- null = любые
  url text,
  qs_rank integer,
  acceptance_rate numeric check (acceptance_rate between 0 and 1),
  typical jsonb not null default '{}',       -- {gpa100, ielts, sat}
  requirements jsonb not null default '{}',  -- {minIelts, minGpa100, satRequired}
  tuition_usd integer,
  living_usd integer,
  funding jsonb not null default '{}',       -- programs.funding
  weights jsonb not null default '{}',       -- programs.weights: {essay, recommendations, interview}
  is_full_grant boolean not null default false,
  deadline_note text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  program_id text not null, -- без внешнего ключа: программы из админки живут в content_items
  full_name text not null,
  phone text not null,
  email text,
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new','contacted','applied','enrolled')),
  created_at timestamptz not null default now()
);

-- Учёт лимитов ИИ (для строгого учёта вместо лимитера в памяти).
create table if not exists public.usage (
  profile_id uuid references public.profiles(id) on delete cascade,
  date date not null default current_date,
  ai_messages integer not null default 0,
  web_searches integer not null default 0,
  primary key (profile_id, date)
);

-- Исходы поступления — основа будущей калибровки правил (с согласием и подтверждением).
create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  program_id text references public.programs(id),
  status text check (status in ('accepted','rejected','waitlist')),
  aid_received_usd integer,
  proof_verified boolean not null default false,
  anonymized_use_consent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.leads enable row level security;
alter table public.usage enable row level security;
alter table public.outcomes enable row level security;

-- Программы читают все.
drop policy if exists "programs readable" on public.programs;
create policy "programs readable" on public.programs for select using (true);

-- Когда появится вход: пользователь видит и меняет только свой профиль и свои лиды.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

drop policy if exists "own leads" on public.leads;
create policy "own leads" on public.leads for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid()));

drop policy if exists "own outcomes" on public.outcomes;
create policy "own outcomes" on public.outcomes for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid()));

create index if not exists leads_program_idx on public.leads(program_id, created_at desc);
