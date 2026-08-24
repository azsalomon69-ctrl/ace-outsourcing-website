-- Keep journal stories in the order chosen in the content editor when dates match.
alter table public.blogs
  add column if not exists display_order integer not null default 0 check (display_order >= 0);

-- Preserve the original published journal sequence for existing content.
update public.blogs
set display_order = case slug
  when 'dinner-night-out' then 0
  when 'recognizing-excellence' then 1
  when 'ace-black-valentines' then 2
  when 'christmas-celebration' then 3
  else display_order
end;

create index if not exists blogs_status_published_display_order_idx
  on public.blogs(status, published_at desc, display_order, created_at);
