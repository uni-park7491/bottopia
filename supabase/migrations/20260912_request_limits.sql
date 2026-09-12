begin;
create table if not exists public.bottopia_request_limits (
  key text primary key check (char_length(key) = 64),
  attempts integer not null,
  expires_at timestamptz not null
);
create index if not exists bottopia_request_limits_expiry_idx on public.bottopia_request_limits(expires_at);
alter table public.bottopia_request_limits enable row level security;
revoke all on public.bottopia_request_limits from public, anon, authenticated;
grant select, insert, update, delete on public.bottopia_request_limits to service_role;

create or replace function public.bottopia_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_time_at timestamptz := clock_timestamp();
  result public.bottopia_request_limits;
begin
  if char_length(p_key) <> 64 or p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid limit';
  end if;
  delete from public.bottopia_request_limits where key in (
    select key from public.bottopia_request_limits where expires_at < current_time_at limit 100
  );
  insert into public.bottopia_request_limits as r(key, attempts, expires_at)
  values(p_key, 1, current_time_at + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    attempts = case when r.expires_at <= current_time_at then 1 else least(r.attempts + 1, p_limit + 1) end,
    expires_at = case when r.expires_at <= current_time_at then current_time_at + make_interval(secs => p_window_seconds) else r.expires_at end
  returning * into result;
  return jsonb_build_object('allowed', result.attempts <= p_limit, 'retry_after', greatest(1, ceil(extract(epoch from result.expires_at - current_time_at))::integer));
end;
$$;
revoke all on function public.bottopia_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bottopia_rate_limit(text, integer, integer) to service_role;
commit;
