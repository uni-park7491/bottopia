create extension if not exists pgcrypto;

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  category text not null,
  tool text not null default '',
  model text not null default '',
  prompt text not null,
  negative_prompt text not null default '',
  video_key text not null,
  poster_key text,
  original_filename text not null,
  content_type text not null,
  file_size bigint not null default 0,
  duration_seconds integer,
  published boolean not null default true,
  views integer not null default 0,
  copies integer not null default 0,
  owner_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_published_created_at_idx on public.works (published, created_at desc);
create index if not exists works_category_created_at_idx on public.works (category, created_at desc);

alter table public.works enable row level security;
drop policy if exists "published works are public" on public.works;
create policy "published works are public" on public.works for select using (published = true);

create table if not exists public.work_reactions (
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (work_id, user_id)
);

create index if not exists work_reactions_created_at_idx on public.work_reactions (work_id, created_at desc);
alter table public.work_reactions enable row level security;
drop policy if exists "reactions are public" on public.work_reactions;

create table if not exists public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists work_comments_created_at_idx on public.work_comments (work_id, created_at desc);
alter table public.work_comments enable row level security;
drop policy if exists "comments are public" on public.work_comments;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'works', 'works', true, 524288000,
  array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view work media" on storage.objects;
create policy "public can view work media" on storage.objects for select using (bucket_id = 'works');
