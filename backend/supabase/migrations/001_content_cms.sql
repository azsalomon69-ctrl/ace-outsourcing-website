begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_name text not null default 'site-media',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  byte_size bigint not null check (byte_size > 0),
  category text not null check (category in ('blog','employee','testimonial','job','site')),
  alt_text text not null default '',
  source_kind text not null check (source_kind in ('repository_migration','admin_upload')),
  source_reference text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  rights_status text not null default 'unknown' check (rights_status in ('company_owned','client_permission','licensed','third_party','unknown')),
  rights_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_name, storage_path)
);

create index if not exists media_assets_category_idx on public.media_assets(category);
create index if not exists media_assets_sha256_idx on public.media_assets(sha256);
create index if not exists media_assets_rights_status_idx on public.media_assets(rights_status);

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  category text not null default 'Team culture',
  excerpt text not null default '',
  content jsonb not null default '[]'::jsonb check (jsonb_typeof(content) = 'array'),
  author_name text not null default 'ACE Team',
  cover_media_id uuid references public.media_assets(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create index if not exists blogs_status_published_idx on public.blogs(status, published_at desc);

create table if not exists public.blog_images (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blog_id, media_asset_id)
);

create index if not exists blog_images_order_idx on public.blog_images(blog_id, sort_order);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  role_title text not null,
  department text,
  quote text not null default '',
  bio text,
  portrait_media_id uuid references public.media_assets(id) on delete restrict,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create index if not exists employees_status_order_idx on public.employees(status, display_order);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  company_name text not null,
  quote text not null,
  rating numeric(2,1) not null default 5.0 check (rating between 1.0 and 5.0),
  logo_media_id uuid references public.media_assets(id) on delete restrict,
  display_order integer not null default 0 check (display_order >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  permission_confirmed boolean not null default false,
  permission_reference text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or (published_at is not null and permission_confirmed))
);

create index if not exists testimonials_status_order_idx on public.testimonials(status, display_order);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  category text not null check (category in ('sales_marketing','operations_people','creative_tech')),
  department text not null,
  employment_type text not null,
  location text not null,
  work_setup text not null default 'onsite' check (work_setup in ('onsite','hybrid','remote')),
  application_url text check (application_url is null or application_url ~ '^https://'),
  summary text not null,
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(responsibilities) = 'array'),
  qualifications jsonb not null default '[]'::jsonb check (jsonb_typeof(qualifications) = 'array'),
  hiring_tier text not null default 'accepting' check (hiring_tier in ('urgent','active','accepting')),
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  image_media_id uuid references public.media_assets(id) on delete restrict,
  published_at timestamptz,
  closes_at timestamptz,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'open' or published_at is not null),
  check (closes_at is null or published_at is null or closes_at >= published_at)
);

create index if not exists jobs_status_tier_order_idx on public.jobs(status, hiring_tier, display_order);
create index if not exists jobs_category_idx on public.jobs(category);

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
drop trigger if exists blogs_set_updated_at on public.blogs;
create trigger blogs_set_updated_at before update on public.blogs for each row execute function public.set_updated_at();
drop trigger if exists blog_images_set_updated_at on public.blog_images;
create trigger blog_images_set_updated_at before update on public.blog_images for each row execute function public.set_updated_at();
drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at before update on public.testimonials for each row execute function public.set_updated_at();
drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.blogs enable row level security;
alter table public.blog_images enable row level security;
alter table public.employees enable row level security;
alter table public.testimonials enable row level security;
alter table public.jobs enable row level security;

-- No anon/authenticated table policies are created. The browser uses the Render API;
-- only the server-side Supabase secret key performs data mutations and reads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
