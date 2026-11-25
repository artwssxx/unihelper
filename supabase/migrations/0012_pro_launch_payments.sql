create table public.pro_launch_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  amount integer not null default 30000 check (amount = 30000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  receipt_type text not null check (receipt_type in ('image/png', 'image/jpeg', 'image/webp')),
  receipt text not null,
  receipt_hash text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  access_until timestamptz
);

alter table public.pro_launch_payments enable row level security;
revoke all on public.pro_launch_payments from anon, authenticated;
grant select, insert, update on public.pro_launch_payments to service_role;

create unique index pro_launch_one_pending on public.pro_launch_payments (user_id) where status = 'pending';
create unique index pro_launch_unique_receipt on public.pro_launch_payments (receipt_hash) where status <> 'rejected';
create index pro_launch_access on public.pro_launch_payments (user_id, access_until desc) where status = 'approved';

create function public.submit_pro_launch_payment(buyer uuid, image_type text, image text, image_hash text)
returns text
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(buyer::text, 0));
  if exists (
    select from public.pro_launch_payments
    where user_id = buyer and status = 'approved' and access_until > now()
  ) then
    return 'active';
  end if;
  insert into public.pro_launch_payments (user_id, receipt_type, receipt, receipt_hash)
    values (buyer, image_type, image, image_hash)
    on conflict do nothing;
  if not found then
    return 'duplicate';
  end if;
  return 'submitted';
end;
$$;

revoke all on function public.submit_pro_launch_payment(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_pro_launch_payment(uuid, text, text, text) to service_role;

create function public.review_pro_launch_payment(payment_id uuid, approve boolean)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  buyer uuid;
begin
  select user_id into buyer from public.pro_launch_payments where id = payment_id;
  if buyer is not null then
    perform pg_advisory_xact_lock(hashtextextended(buyer::text, 0));
  end if;

  update public.pro_launch_payments
  set status = case when approve then 'approved' else 'rejected' end,
      reviewed_at = now(),
      access_until = case when approve then ((now() at time zone 'Asia/Tashkent') + interval '2 months') at time zone 'Asia/Tashkent' end
  where id = payment_id and status = 'pending' and (not approve or user_id is not null);
  return found;
end;
$$;

revoke all on function public.review_pro_launch_payment(uuid, boolean) from public, anon, authenticated;
grant execute on function public.review_pro_launch_payment(uuid, boolean) to service_role;
