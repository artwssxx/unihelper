-- Публикация сайта-портфолио: хранится только публичный снимок (скрытые поля не попадают в базу).
alter table public.portfolio_sites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.portfolio_sites add column if not exists content jsonb;
alter table public.portfolio_sites add column if not exists link_token text;
alter table public.portfolio_sites add column if not exists updated_at timestamptz default now();
create unique index if not exists portfolio_sites_user_idx on public.portfolio_sites(user_id);
