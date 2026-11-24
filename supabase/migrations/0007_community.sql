-- Комьюнити: карточки участников, проекты «ищу команду», организации, чаты, жалобы и блокировки.
-- Доступ только через серверные API (service role): RLS включён без политик, анонимный ключ ничего не читает.

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  grade int check (grade between 7 and 16),
  city text check (char_length(city) <= 60),
  major text check (char_length(major) <= 40),
  bio text not null default '' check (char_length(bio) <= 600),
  skills text[] not null default '{}',
  looking_for text not null default '' check (char_length(looking_for) <= 200),
  visible boolean not null default true,
  hidden_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('team', 'study', 'question')),
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  roles text[] not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_posts_feed_idx on public.community_posts(hidden, status, created_at desc);

create table if not exists public.community_orgs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 3 and 80),
  kind text not null check (kind in ('club', 'olympiad', 'volunteer', 'startup', 'media', 'other')),
  city text check (char_length(city) <= 60),
  description text not null default '' check (char_length(description) <= 1500),
  owner_id uuid references auth.users(id) on delete set null,
  verified boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_org_members (
  org_id uuid not null references public.community_orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.community_chats (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'org')),
  org_id uuid references public.community_orgs(id) on delete cascade,
  direct_key text unique,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists community_chats_org_idx on public.community_chats(org_id) where kind = 'org';

create table if not exists public.community_chat_members (
  chat_id uuid not null references public.community_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index if not exists community_chat_members_user_idx on public.community_chat_members(user_id);

create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.community_chats(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_messages_chat_idx on public.community_messages(chat_id, id);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('post', 'message', 'profile', 'org')),
  target_id text not null check (char_length(target_id) <= 64),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists community_reports_status_idx on public.community_reports(status, created_at desc);

create table if not exists public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_orgs enable row level security;
alter table public.community_org_members enable row level security;
alter table public.community_chats enable row level security;
alter table public.community_chat_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_blocks enable row level security;
