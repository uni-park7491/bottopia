begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  location text not null default '' check (char_length(location) <= 80),
  tools text not null default '' check (char_length(tools) <= 200),
  instagram_url text,
  x_url text,
  youtube_url text,
  tiktok_url text,
  website_url text,
  available_for_work boolean not null default false,
  role text not null default 'MEMBER' check (role in ('MEMBER', 'CREATOR', 'FOUNDING_CREATOR', 'ADMIN')),
  creator_status text not null default 'PENDING' check (creator_status in ('PENDING', 'APPROVED', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_creator_status_idx on public.profiles (creator_status, created_at desc);
alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;

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
  creator_id uuid references public.profiles(id) on delete set null,
  work_type text not null default 'ORIGINAL' check (work_type in ('ORIGINAL', 'COMMUNITY', 'REMIX')),
  remix_of uuid references public.works(id) on delete set null,
  process_notes text not null default '',
  aspect_ratio text not null default '',
  seed text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.works add column if not exists creator_id uuid references public.profiles(id) on delete set null;
alter table public.works add column if not exists work_type text not null default 'ORIGINAL';
alter table public.works add column if not exists remix_of uuid references public.works(id) on delete set null;
alter table public.works add column if not exists process_notes text not null default '';
alter table public.works add column if not exists aspect_ratio text not null default '';
alter table public.works add column if not exists seed text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.works'::regclass and conname = 'works_work_type_check'
  ) then
    alter table public.works
      add constraint works_work_type_check check (work_type in ('ORIGINAL', 'COMMUNITY', 'REMIX'));
  end if;
end $$;

create index if not exists works_published_created_at_idx on public.works (published, created_at desc);
create index if not exists works_category_created_at_idx on public.works (category, created_at desc);
create index if not exists works_creator_created_at_idx on public.works (creator_id, created_at desc);
create index if not exists works_remix_of_idx on public.works (remix_of, created_at desc);

alter table public.works enable row level security;
drop policy if exists "published works are public" on public.works;
-- Read through the app API, which excludes owner_email and filters unpublished works.

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

create table if not exists public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  contact text not null check (char_length(contact) between 4 and 180),
  project_type text not null default 'OTHER',
  timeline_budget text not null default '',
  brief text not null check (char_length(brief) between 10 and 3000),
  locale text not null default 'ko',
  status text not null default 'NEW' check (status in ('NEW', 'REVIEWING', 'REPLIED', 'ARCHIVED')),
  created_at timestamptz not null default now()
);

create index if not exists project_inquiries_created_at_idx on public.project_inquiries (created_at desc);
alter table public.project_inquiries enable row level security;

-- Supabase projects with automatic table grants disabled need explicit server grants.
-- Browser clients cannot read raw member identifiers or write around the app's authorization.
revoke all on public.profiles, public.works, public.work_reactions, public.work_comments, public.project_inquiries from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles, public.works, public.work_reactions, public.work_comments, public.project_inquiries to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'works', 'works', false, 52428800,
  array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view work media" on storage.objects;
-- Private storage: short-lived playback URLs are issued only after checking visibility.

commit;
