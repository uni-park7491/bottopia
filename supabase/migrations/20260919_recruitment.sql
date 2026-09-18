begin;
create table if not exists public.recruitment_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null, profile_handle text,
 title text not null check (char_length(title) between 4 and 80),
 body text not null check (char_length(body) between 20 and 2000),
 tags text[] not null check (cardinality(tags) between 1 and 8),
 compensation text not null check (compensation in ('무보수 협업','유료 협업','수익 배분','협의')),
 schedule text not null check (char_length(schedule) between 1 and 100),
 contact_url text not null check (contact_url like 'https://%' and char_length(contact_url) <= 500),
 status text not null default 'open' check (status in ('open','closed')),
 created_at timestamptz not null default now()
);
create index if not exists recruitment_created_idx on public.recruitment_posts(created_at desc);
create table if not exists public.recruitment_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 keywords text[] not null default '{}' check (cardinality(keywords) <= 8), updated_at timestamptz not null default now()
);
create table if not exists public.recruitment_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.recruitment_posts(id) on delete cascade,
 matched_keywords text[] not null, read_at timestamptz, created_at timestamptz not null default now(),
 unique(user_id,post_id)
);
create index if not exists recruitment_notifications_user_idx on public.recruitment_notifications(user_id,created_at desc);
alter table public.recruitment_posts enable row level security;
alter table public.recruitment_preferences enable row level security;
alter table public.recruitment_notifications enable row level security;
-- No direct client access. App routes enforce ownership, origin checks and rate limits.
revoke all on public.recruitment_posts,public.recruitment_preferences,public.recruitment_notifications from anon,authenticated;
grant all on public.recruitment_posts,public.recruitment_preferences,public.recruitment_notifications to service_role;
create or replace function public.notify_recruitment_keywords() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.recruitment_notifications(user_id,post_id,matched_keywords)
 select p.user_id,new.id,array(select k from unnest(p.keywords) k
   where strpos(lower(new.title || ' ' || new.body || ' ' || array_to_string(new.tags,' ')),lower(k)) > 0)
 from public.recruitment_preferences p
 where p.user_id <> new.user_id and exists(select 1 from unnest(p.keywords) k
   where strpos(lower(new.title || ' ' || new.body || ' ' || array_to_string(new.tags,' ')),lower(k)) > 0)
 on conflict(user_id,post_id) do nothing;
 return new;
end $$;
revoke all on function public.notify_recruitment_keywords() from public,anon,authenticated;
drop trigger if exists recruitment_keyword_notification on public.recruitment_posts;
create trigger recruitment_keyword_notification after insert on public.recruitment_posts for each row execute function public.notify_recruitment_keywords();
commit;
