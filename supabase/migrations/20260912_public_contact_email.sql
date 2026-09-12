-- Opt-in contact address, independent of auth.users.email. No backfill.
alter table public.profiles add column if not exists contact_email text
  check (contact_email is null or char_length(contact_email) between 3 and 254);
comment on column public.profiles.contact_email is
  'User-supplied, explicitly public contact email. NULL when not published. Never populated from authentication data.';
