begin;

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

create index if not exists profiles_creator_status_idx on public.profiles (creator_status, created_at desc);
create index if not exists works_creator_created_at_idx on public.works (creator_id, created_at desc);
create index if not exists works_remix_of_idx on public.works (remix_of, created_at desc);

alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;
revoke all on public.profiles from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.works to service_role;

commit;
