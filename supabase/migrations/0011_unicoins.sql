-- UniCoins: журнал начислений и списаний, разовые открытия платных функций, серия ежедневных заходов, приглашения.
-- Всё меняется только серверными функциями (service role). Баланс = сумма журнала.

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null check (delta <> 0 and abs(delta) <= 100000),
  reason text not null check (char_length(reason) <= 40),
  ref text not null default '' check (char_length(ref) <= 80),
  created_at timestamptz not null default now()
);
-- Одно начисление на (причину, ссылку): повторный запрос ничего не добавит.
create unique index if not exists coin_ledger_once on public.coin_ledger(user_id, reason, ref);
create index if not exists coin_ledger_user_idx on public.coin_ledger(user_id, created_at desc);

create table if not exists public.coin_unlocks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  ref text not null default '' check (char_length(ref) <= 80),
  remaining int not null default 1 check (remaining >= 0),
  created_at timestamptz not null default now()
);
create index if not exists coin_unlocks_user_idx on public.coin_unlocks(user_id, kind);

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 30 and 2000),
  created_at timestamptz not null default now()
);

alter table public.user_state add column if not exists streak_days int not null default 0;
alter table public.user_state add column if not exists streak_last date;
alter table public.user_state add column if not exists ref_code text unique;
alter table public.user_state add column if not exists referred_by uuid references auth.users(id) on delete set null;
alter table public.user_state drop constraint if exists user_state_plan_source_check;
alter table public.user_state add constraint user_state_plan_source_check check (plan_source in ('test', 'paid', 'coins'));

alter table public.coin_ledger enable row level security;
alter table public.coin_unlocks enable row level security;
alter table public.feedback enable row level security;

create or replace function public.coin_balance(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from coin_ledger where user_id = uid
$$;

-- Начисление: true — если добавлено (ещё не было такого reason+ref).
create or replace function public.coin_award(uid uuid, amount int, why text, r text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if amount <= 0 then return false; end if;
  insert into coin_ledger(user_id, delta, reason, ref) values (uid, amount, why, coalesce(r, ''))
  on conflict (user_id, reason, ref) do nothing;
  return found;
end $$;

-- Списание с блокировкой по пользователю: -1 — не хватает монет, иначе новый баланс.
create or replace function public.coin_spend(uid uuid, amount int, why text, r text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if amount <= 0 then return -1; end if;
  perform pg_advisory_xact_lock(hashtext('coins:' || uid::text));
  select coalesce(sum(delta), 0) into bal from coin_ledger where user_id = uid;
  if bal < amount then return -1; end if;
  insert into coin_ledger(user_id, delta, reason, ref) values (uid, -amount, why, r);
  return bal - amount;
end $$;

-- Использовать одно разовое открытие (kind; ref — для открытий, привязанных к объекту).
create or replace function public.coin_take_unlock(uid uuid, k text, r text) returns boolean
language plpgsql security definer set search_path = public as $$
declare row_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('unlock:' || uid::text));
  select id into row_id from coin_unlocks
    where user_id = uid and kind = k and (ref = coalesce(r, '') or ref = '') and remaining > 0
    order by created_at limit 1;
  if row_id is null then return false; end if;
  update coin_unlocks set remaining = remaining - 1 where id = row_id;
  return true;
end $$;

-- Ежедневный заход: серия дней и награда (5 + бонус на 3/7/14 день и каждые 30 дней).
create or replace function public.coin_checkin(uid uuid, today date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s int; last date; reward int;
begin
  perform pg_advisory_xact_lock(hashtext('checkin:' || uid::text));
  insert into user_state(user_id) values (uid) on conflict (user_id) do nothing;
  select streak_days, streak_last into s, last from user_state where user_id = uid;
  if last = today then return jsonb_build_object('awarded', 0, 'streak', s); end if;
  s := case when last = today - 1 then s + 1 else 1 end;
  reward := 5 + case when s = 3 then 10 when s = 7 then 30 when s = 14 then 60 when s % 30 = 0 then 150 else 0 end;
  update user_state set streak_days = s, streak_last = today where user_id = uid;
  insert into coin_ledger(user_id, delta, reason, ref) values (uid, reward, 'checkin', today::text)
  on conflict (user_id, reason, ref) do nothing;
  return jsonb_build_object('awarded', reward, 'streak', s);
end $$;

revoke all on function public.coin_balance(uuid) from public, anon, authenticated;
revoke all on function public.coin_award(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.coin_spend(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.coin_take_unlock(uuid, text, text) from public, anon, authenticated;
revoke all on function public.coin_checkin(uuid, date) from public, anon, authenticated;
