begin;
alter table public.recruitment_posts add column if not exists contacts jsonb;
alter table public.recruitment_posts add column if not exists intro_urls text[];
alter table public.recruitment_applications add column if not exists contacts jsonb;
alter table public.recruitment_applications add column if not exists intro_urls text[];
commit;
