-- TrustBooker transactional command functions.
-- Apply only after schema.sql in a reviewed Supabase migration.
-- SECURITY DEFINER functions must validate auth.uid() and all arguments internally.

-- Owners may read their draft/suspended provider workspace, while public users still
-- only see active rows through the public policy in schema.sql.
create policy providers_owner_read on public.provider_profiles
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

grant select (status) on public.provider_profiles to authenticated;

create policy services_owner_read on public.services
  for select to authenticated
  using (
    exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.owner_user_id = (select auth.uid())
    )
  );

grant select (is_active) on public.services to authenticated;

create or replace function public.bootstrap_provider_profile(
  p_slug text,
  p_display_name text,
  p_headline text,
  p_description text,
  p_country_code text,
  p_locality text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_provider_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  p_slug := lower(trim(p_slug));
  p_display_name := trim(p_display_name);
  p_headline := trim(p_headline);
  p_description := trim(p_description);
  p_country_code := upper(trim(p_country_code));
  p_locality := trim(p_locality);

  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_slug) > 80 then
    raise exception 'invalid provider slug' using errcode = '22023';
  end if;
  if char_length(p_display_name) not between 2 and 120 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;
  if char_length(p_headline) not between 5 and 180 then
    raise exception 'invalid headline' using errcode = '22023';
  end if;
  if char_length(p_description) > 10000 then
    raise exception 'description too long' using errcode = '22023';
  end if;
  if char_length(p_country_code) <> 2 or char_length(p_locality) < 2 then
    raise exception 'invalid location' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.provider_profiles
    where owner_user_id = v_user_id and status <> 'suspended'
  ) then
    raise exception 'provider profile already exists' using errcode = '23505';
  end if;

  insert into public.provider_profiles (
    owner_user_id, slug, display_name, headline, description, country_code, locality, status
  ) values (
    v_user_id, p_slug, p_display_name, p_headline, p_description, p_country_code, p_locality, 'draft'
  )
  returning id into v_provider_id;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'provider')
  on conflict do nothing;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'provider.profile_created',
    'provider_profile',
    v_provider_id::text,
    jsonb_build_object('country_code', p_country_code)
  );

  return v_provider_id;
end;
$$;

revoke all on function public.bootstrap_provider_profile(text, text, text, text, text, text) from public;
grant execute on function public.bootstrap_provider_profile(text, text, text, text, text, text) to authenticated;

create or replace function public.create_provider_service(
  p_provider_id uuid,
  p_category_slug text,
  p_title text,
  p_description text,
  p_starting_price_minor bigint,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_service_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.provider_profiles
    where id = p_provider_id and owner_user_id = v_user_id and status in ('draft','active','paused')
  ) then
    raise exception 'provider profile not owned by caller' using errcode = '42501';
  end if;

  p_category_slug := trim(p_category_slug);
  p_title := trim(p_title);
  p_description := trim(p_description);
  p_currency := upper(trim(p_currency));

  if char_length(p_category_slug) < 2 or char_length(p_category_slug) > 80 then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  if char_length(p_title) not between 3 and 160 then
    raise exception 'invalid service title' using errcode = '22023';
  end if;
  if char_length(p_description) not between 10 and 10000 then
    raise exception 'invalid service description' using errcode = '22023';
  end if;
  if p_starting_price_minor is not null and p_starting_price_minor < 0 then
    raise exception 'invalid price' using errcode = '22023';
  end if;
  if char_length(p_currency) <> 3 then
    raise exception 'invalid currency' using errcode = '22023';
  end if;

  insert into public.services (
    provider_id, category_slug, title, description, starting_price_minor, currency, is_active
  ) values (
    p_provider_id, p_category_slug, p_title, p_description, p_starting_price_minor, p_currency, false
  )
  returning id into v_service_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'provider.service_created',
    'service',
    v_service_id::text,
    jsonb_build_object('provider_id', p_provider_id, 'category_slug', p_category_slug)
  );

  return v_service_id;
end;
$$;

revoke all on function public.create_provider_service(uuid, text, text, text, bigint, text) from public;
grant execute on function public.create_provider_service(uuid, text, text, text, bigint, text) to authenticated;
