-- Автообновление дневника: с согласия ученика храним СЕССИЮ eMaktab/EMIS (cookie / токен), а не пароль.
-- Сессия зашифрована ключом сервера (AES-GCM), живёт столько, сколько её держит сама система (eMaktab ≈ 2 недели).
-- Удаляется при отключении, выходе или истечении. Доступ — только сервер (service role), RLS без политик.
create table if not exists public.school_links (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('emis', 'emaktab')),
  secret text not null,
  expires_at timestamptz,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, source)
);
alter table public.school_links enable row level security;
