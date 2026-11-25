create table if not exists public.site_traffic_daily (
  day date not null,
  tab_id uuid not null,
  page_views bigint not null default 1,
  primary key (day, tab_id)
);

alter table public.site_traffic_daily enable row level security;
revoke all on table public.site_traffic_daily from public, anon, authenticated;
grant select, insert, update on table public.site_traffic_daily to service_role;

create or replace function public.record_site_page_view(view_tab_id uuid)
returns void
language sql
set search_path = ''
as $$
  insert into public.site_traffic_daily as traffic (day, tab_id)
  values ((now() at time zone 'Asia/Tashkent')::date, $1)
  on conflict (day, tab_id) do update set page_views = traffic.page_views + 1;
$$;

create or replace function public.admin_site_traffic()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with period as (select (now() at time zone 'Asia/Tashkent')::date as today)
  select jsonb_build_object(
    'visitsToday', count(*) filter (where day = today),
    'viewsToday', coalesce(sum(page_views) filter (where day = today), 0),
    'visits7Days', count(distinct tab_id),
    'views7Days', coalesce(sum(page_views), 0)
  )
  from public.site_traffic_daily
  cross join period
  where day between today - 6 and today;
$$;

revoke all on function public.record_site_page_view(uuid) from public, anon, authenticated;
revoke all on function public.admin_site_traffic() from public, anon, authenticated;
grant execute on function public.record_site_page_view(uuid) to service_role;
grant execute on function public.admin_site_traffic() to service_role;

create or replace function public.admin_site_accounts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'new7Days', count(*) filter (
      where created_at >= (date_trunc('day', now() at time zone 'Asia/Tashkent') - interval '6 days')
        at time zone 'Asia/Tashkent'
    )
  )
  from auth.users
  where not is_anonymous and deleted_at is null;
$$;

revoke all on function public.admin_site_accounts() from public, anon, authenticated;
grant execute on function public.admin_site_accounts() to service_role;
