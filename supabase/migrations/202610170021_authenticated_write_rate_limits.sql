-- Database-backed authenticated write guardrails.
-- These limits protect accepted marketplace writes across horizontally scaled app
-- instances. They complement (not replace) edge/IP/bot controls for production.

create table private.rate_limit_buckets (
  actor_user_id uuid not null,
  action text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (actor_user_id, action, window_started_at)
);

revoke all on private.rate_limit_buckets from public, anon, authenticated;

create or replace function private.enforce_authenticated_rate_limit(
  p_action text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_attempt_count integer;
begin
  -- Trusted service-role/maintenance writes do not carry an end-user auth.uid().
  if v_user_id is null then
    return;
  end if;

  if p_action is null or char_length(p_action) < 2 or p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit configuration' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limit_buckets (
    actor_user_id,
    action,
    window_started_at,
    attempt_count
  ) values (
    v_user_id,
    p_action,
    v_window_start,
    1
  )
  on conflict (actor_user_id, action, window_started_at) do update
    set attempt_count = private.rate_limit_buckets.attempt_count + 1
  returning attempt_count into v_attempt_count;

  delete from private.rate_limit_buckets
  where actor_user_id = v_user_id
    and action = p_action
    and window_started_at < now() - interval '2 days';

  if v_attempt_count > p_max_attempts then
    raise exception 'rate limit exceeded for %', p_action using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.enforce_authenticated_rate_limit(text, integer, integer) from public, anon, authenticated;

create or replace function private.enforce_marketplace_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'service_requests' then
      perform private.enforce_authenticated_rate_limit('service_request.create', 20, 600);
    when 'proposals' then
      perform private.enforce_authenticated_rate_limit('proposal.create', 50, 600);
    when 'messages' then
      perform private.enforce_authenticated_rate_limit('message.create', 120, 300);
    when 'reviews' then
      perform private.enforce_authenticated_rate_limit('review.create', 10, 3600);
    when 'reports' then
      perform private.enforce_authenticated_rate_limit('report.create', 20, 3600);
    else
      raise exception 'unsupported rate limited table: %', tg_table_name using errcode = '22023';
  end case;

  return new;
end;
$$;

revoke all on function private.enforce_marketplace_insert_rate_limit() from public, anon, authenticated;

drop trigger if exists service_requests_rate_limit on public.service_requests;
create trigger service_requests_rate_limit
before insert on public.service_requests
for each row execute function private.enforce_marketplace_insert_rate_limit();

drop trigger if exists proposals_rate_limit on public.proposals;
create trigger proposals_rate_limit
before insert on public.proposals
for each row execute function private.enforce_marketplace_insert_rate_limit();

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
before insert on public.messages
for each row execute function private.enforce_marketplace_insert_rate_limit();

drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit
before insert on public.reviews
for each row execute function private.enforce_marketplace_insert_rate_limit();

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
before insert on public.reports
for each row execute function private.enforce_marketplace_insert_rate_limit();
