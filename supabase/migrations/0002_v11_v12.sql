-- v1.1 моки и v1.2 ивенты, дорожная карта, уроки, портфолио.
-- Вопросы и правильные ответы читает только сервер (service role): RLS без политик для клиентов.

create table if not exists public.question_bank (
  id text primary key,
  exam text not null check (exam in ('sat','ielts')),
  section text not null check (section in ('math','rw','reading')),
  domain text, skill text,
  difficulty smallint check (difficulty between 1 and 3),
  stem text not null, passage_id text,
  choices text[], answer text not null,
  answer_type text not null check (answer_type in ('mcq','spr','text')),
  explanation text,
  source text check (source in ('ai','human','code')),
  verified boolean not null default false, verified_by text,
  times_used integer not null default 0,
  correct_rate numeric
);

create table if not exists public.passages (
  id text primary key, exam text not null, title text, text text not null, topic text, word_count integer, verified boolean default false
);

create table if not exists public.mock_attempts (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  exam text not null, section text not null,
  mode text not null check (mode in ('light','hard')),
  question_ids text[],
  started_at timestamptz not null, deadline_at timestamptz, finished_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','completed','interrupted')),
  raw_correct integer, module2_path text check (module2_path in ('easy','hard')),
  score_low integer, score_high integer, band numeric
);

create table if not exists public.attempt_answers (
  attempt_id uuid references public.mock_attempts(id) on delete cascade,
  question_id text, answer text, is_correct boolean, time_spent_sec integer
);

create table if not exists public.attempt_events (
  attempt_id uuid references public.mock_attempts(id) on delete cascade,
  type text check (type in ('fullscreen_exit','tab_hidden','blur','unload','copy','paste')),
  at timestamptz not null default now()
);

create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(), name text not null,
  type text check (type in ('school','club','university','ngo','company')),
  contact text, verified boolean default false,
  owner_profile_id uuid references public.profiles(id)
);

create table if not exists public.opportunities (
  id text primary key, title text not null, type text, organizer_id uuid references public.organizers(id),
  location text, online boolean default false, starts_at timestamptz, tags text[],
  registration_mode text check (registration_mode in ('external','unihelper')), external_url text,
  capacity integer, questions jsonb, is_promoted boolean default false, published boolean default false
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text references public.opportunities(id),
  profile_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('registered','waitlist','attended','cancelled','no_show')),
  answers jsonb, shared_fields text[], consent_at timestamptz, qr_token text unique
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  template_id text, title text, track text check (track in ('tests','activities','documents','applications')),
  due_date date, is_estimated boolean, status text, source text check (source in ('auto','manual'))
);

create table if not exists public.lesson_progress (
  profile_id uuid references public.profiles(id) on delete cascade,
  lesson_id text, watched_pct integer, quiz_score numeric, completed_at timestamptz,
  primary key (profile_id, lesson_id)
);

create table if not exists public.portfolio_sites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  slug text unique, template text, visibility text check (visibility in ('draft','link','public')),
  sections jsonb, show_fields text[], parent_consent_at timestamptz, published_at timestamptz
);

alter table public.question_bank enable row level security;
alter table public.passages enable row level security;
alter table public.mock_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_events enable row level security;
alter table public.organizers enable row level security;
alter table public.opportunities enable row level security;
alter table public.event_registrations enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.portfolio_sites enable row level security;

drop policy if exists "published opportunities readable" on public.opportunities;
create policy "published opportunities readable" on public.opportunities for select using (published);

drop policy if exists "own attempts" on public.mock_attempts;
create policy "own attempts" on public.mock_attempts for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid()));

drop policy if exists "public portfolios" on public.portfolio_sites;
create policy "public portfolios" on public.portfolio_sites for select using (visibility = 'public');

-- Остальные таблицы: политики «свои строки» через profiles.auth_user_id добавить вместе со входом (как в 0001).
create index if not exists mock_attempts_profile_idx on public.mock_attempts(profile_id, started_at desc);
