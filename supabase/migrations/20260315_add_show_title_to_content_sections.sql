alter table public.content_sections
add column if not exists show_title boolean not null default true;
