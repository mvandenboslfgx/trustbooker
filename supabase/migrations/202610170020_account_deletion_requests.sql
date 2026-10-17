-- Controlled self-service account deletion requests.
-- Actual destructive deletion remains an operations action because transaction,
-- dispute and financial evidence may have retention obligations.

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','cancelled','completed')),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index account_deletion_requests_status_idx
  on public.account_deletion_requests(status, requested_at);

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select (id, status, requested_at, cancelled_at, completed_at, created_at, updated_at)
  on public.account_deletion_requests to authenticated;

create policy account_deletion_requests_self_read on public.account_deletion_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

create trigger set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.status not in ('completed','cancelled')
      and (
        b.buyer_id = v_user_id
        or exists (
          select 1
          from public.provider_profiles p
          where p.id = b.provider_id
            and p.owner_user_id = v_user_id
        )
      )
  ) then
    raise exception 'active marketplace activity must be resolved before account deletion can be requested'
      using errcode = '55000';
  end if;

  insert into public.account_deletion_requests (user_id, status, requested_at, cancelled_at, completed_at)
  values (v_user_id, 'pending', now(), null, null)
  on conflict (user_id) do update
    set status = 'pending',
        requested_at = now(),
        cancelled_at = null,
        completed_at = null
  returning id into v_request_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'account.deletion_requested',
    'account_deletion_request',
    v_request_id::text,
    '{}'::jsonb
  );

  return v_request_id;
end;
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      cancelled_at = now()
  where user_id = v_user_id
    and status = 'pending'
  returning id into v_request_id;

  if v_request_id is null then
    return false;
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'account.deletion_cancelled',
    'account_deletion_request',
    v_request_id::text,
    '{}'::jsonb
  );

  return true;
end;
$$;

revoke all on function public.cancel_account_deletion() from public;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function public.get_my_account_deletion_request()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(request_row)
  from (
    select id, status, requested_at, cancelled_at, completed_at
    from public.account_deletion_requests
    where user_id = auth.uid()
    limit 1
  ) as request_row;
$$;

revoke all on function public.get_my_account_deletion_request() from public;
grant execute on function public.get_my_account_deletion_request() to authenticated;
