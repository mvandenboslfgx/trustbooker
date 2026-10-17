-- Provider lifecycle and staff moderation.
-- Verification/status changes remain server-controlled and auditable.

create or replace function public.get_my_roles()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(role::text order by role::text), array[]::text[])
  from public.user_roles
  where user_id = auth.uid();
$$;

revoke all on function public.get_my_roles() from public;
grant execute on function public.get_my_roles() to authenticated;

create or replace function public.update_my_provider_profile(
  p_provider_id uuid,
  p_display_name text,
  p_headline text,
  p_description text,
  p_country_code text,
  p_locality text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  p_display_name := trim(p_display_name);
  p_headline := trim(p_headline);
  p_description := trim(p_description);
  p_country_code := upper(trim(p_country_code));
  p_locality := trim(p_locality);

  if char_length(p_display_name) not between 2 and 120
     or char_length(p_headline) not between 5 and 180
     or char_length(p_description) > 10000
     or char_length(p_country_code) <> 2
     or char_length(p_locality) < 2 then
    raise exception 'invalid provider profile' using errcode = '22023';
  end if;

  update public.provider_profiles
  set display_name = p_display_name,
      headline = p_headline,
      description = p_description,
      country_code = p_country_code,
      locality = p_locality
  where id = p_provider_id
    and owner_user_id = v_user_id
    and status <> 'suspended';

  if not found then
    raise exception 'provider profile not editable' using errcode = '42501';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id)
  values (v_user_id, 'provider.profile_updated', 'provider_profile', p_provider_id::text);
end;
$$;

revoke all on function public.update_my_provider_profile(uuid, text, text, text, text, text) from public;
grant execute on function public.update_my_provider_profile(uuid, text, text, text, text, text) to authenticated;

create or replace function public.submit_provider_for_review(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.services s
    where s.provider_id = p_provider_id
  ) then
    raise exception 'add at least one service before review' using errcode = '22023';
  end if;

  update public.provider_profiles
  set identity_status = 'pending',
      business_status = 'pending'
  where id = p_provider_id
    and owner_user_id = v_user_id
    and status in ('draft', 'paused')
    and identity_status in ('unverified', 'failed', 'expired')
    and business_status in ('unverified', 'failed', 'expired');

  if not found then
    raise exception 'provider is not eligible for review submission' using errcode = '22023';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id)
  values (v_user_id, 'provider.review_submitted', 'provider_profile', p_provider_id::text);
end;
$$;

revoke all on function public.submit_provider_for_review(uuid) from public;
grant execute on function public.submit_provider_for_review(uuid) to authenticated;

create or replace function public.set_provider_service_active(p_service_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_provider_status public.provider_status;
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select p.id, p.status into v_provider_id, v_provider_status
  from public.services s
  join public.provider_profiles p on p.id = s.provider_id
  where s.id = p_service_id and p.owner_user_id = v_user_id
  for update of s;

  if v_provider_id is null then
    raise exception 'service not owned by caller' using errcode = '42501';
  end if;

  if p_active and v_provider_status <> 'active' then
    raise exception 'provider must be active before publishing services' using errcode = '22023';
  end if;

  update public.services
  set is_active = p_active
  where id = p_service_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    case when p_active then 'provider.service_published' else 'provider.service_unpublished' end,
    'service',
    p_service_id::text,
    jsonb_build_object('provider_id', v_provider_id)
  );
end;
$$;

revoke all on function public.set_provider_service_active(uuid, boolean) from public;
grant execute on function public.set_provider_service_active(uuid, boolean) to authenticated;

create or replace function public.list_provider_review_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'display_name', p.display_name,
    'headline', p.headline,
    'description', p.description,
    'country_code', p.country_code,
    'locality', p.locality,
    'identity_status', p.identity_status,
    'business_status', p.business_status,
    'status', p.status,
    'created_at', p.created_at,
    'service_count', (select count(*) from public.services s where s.provider_id = p.id)
  ) order by p.created_at asc), '[]'::jsonb)
  into v_result
  from public.provider_profiles p
  where p.identity_status = 'pending' or p.business_status = 'pending';

  return v_result;
end;
$$;

revoke all on function public.list_provider_review_queue() from public;
grant execute on function public.list_provider_review_queue() to authenticated;

create or replace function public.moderate_provider(p_provider_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = v_user_id and role in ('admin', 'moderator')
  ) then
    raise exception 'staff role required' using errcode = '42501';
  end if;

  if p_decision = 'approve' then
    update public.provider_profiles
    set status = 'active', identity_status = 'verified', business_status = 'verified'
    where id = p_provider_id and status <> 'suspended';
  elsif p_decision = 'reject' then
    update public.provider_profiles
    set status = 'draft', identity_status = 'failed', business_status = 'failed'
    where id = p_provider_id and status <> 'suspended';
  elsif p_decision = 'suspend' then
    update public.provider_profiles
    set status = 'suspended'
    where id = p_provider_id;
    update public.services set is_active = false where provider_id = p_provider_id;
  else
    raise exception 'invalid moderation decision' using errcode = '22023';
  end if;

  if not found and p_decision <> 'suspend' then
    raise exception 'provider not found or decision not applicable' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'provider.moderated',
    'provider_profile',
    p_provider_id::text,
    jsonb_build_object('decision', p_decision)
  );
end;
$$;

revoke all on function public.moderate_provider(uuid, text) from public;
grant execute on function public.moderate_provider(uuid, text) to authenticated;
