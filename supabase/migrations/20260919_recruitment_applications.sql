begin;
alter table public.recruitment_posts add column if not exists contact_type text;
alter table public.recruitment_posts add column if not exists contact_value text;
alter table public.recruitment_posts add column if not exists file_ids uuid[] not null default '{}';
create table if not exists public.recruitment_applications (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.recruitment_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null,
 message text not null check(char_length(message) between 10 and 2000),
 intro_url text not null,
 contact_type text not null check(contact_type in ('email','kakao','phone')),
 contact_value text not null check(char_length(contact_value) between 1 and 254),
 file_ids uuid[] not null default '{}' check(cardinality(file_ids)<=3),
 status text not null default 'pending' check(status in ('pending','accepted','withdrawn')),
 created_at timestamptz not null default now(), unique(post_id,user_id)
);
create table if not exists public.recruitment_files (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique, name text not null, mime text not null check(mime in ('application/pdf','image/png')),
 size integer not null check(size>0 and size<=3145728), created_at timestamptz not null default now()
);
create index if not exists recruitment_application_post_idx on public.recruitment_applications(post_id);
create index if not exists recruitment_application_user_idx on public.recruitment_applications(user_id);
alter table public.recruitment_applications enable row level security;
alter table public.recruitment_files enable row level security;
revoke all on public.recruitment_applications,public.recruitment_files from anon,authenticated;
grant all on public.recruitment_applications,public.recruitment_files to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recruitment-private','recruitment-private',false,3145728,array['application/pdf','image/png'])
on conflict(id) do nothing;
commit;
