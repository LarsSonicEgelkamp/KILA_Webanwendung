alter table public.content_sections
add column if not exists order_index integer;

with ranked_sections as (
  select
    id,
    row_number() over (partition by page_section_id order by created_at, id) as next_order_index
  from public.content_sections
)
update public.content_sections as content_sections
set order_index = ranked_sections.next_order_index
from ranked_sections
where content_sections.id = ranked_sections.id
  and content_sections.order_index is null;

alter table public.content_sections
alter column order_index set default 0;

alter table public.content_sections
alter column order_index set not null;
