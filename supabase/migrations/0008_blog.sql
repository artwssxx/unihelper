-- Блог: статьи хранятся в той же таблице правок контента, что программы, ивенты и уроки.
alter table public.content_items drop constraint if exists content_items_kind_check;
alter table public.content_items add constraint content_items_kind_check check (kind in ('programs', 'events', 'lessons', 'posts'));
