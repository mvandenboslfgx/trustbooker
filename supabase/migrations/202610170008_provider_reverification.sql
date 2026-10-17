-- Material edits to an active/verified provider must invalidate prior verification.
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
  v_current public.provider_profiles%rowtype;
  v_material_change boolean;
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

  select * into v_current
  from public.provider_profiles
  where id = p_provider_id and owner_user_id = v_user_id
  for update;

  if not found or v_current.status = 'suspended' then
    raise exception 'provider profile not editable' using errcode = '42501';
  end if;

  v_material_change :=
    v_current.display_name is distinct from p_display_name
    or v_current.country_code is distinct from p_country_code
    or v_current.locality is distinct from p_locality;

  update public.provider_profiles
  set display_name = p_display_name,
      headline = p_headline,
      description = p_description,
      country_code = p_country_code,
      locality = p_locality,
      status = case when v_material_change and status = 'active' then 'paused'::public.provider_status else status end,
      identity_status = case when v_material_change and identity_status = 'verified' then 'unverified'::public.verification_status else identity_status end,
      business_status = case when v_material_change and business_status = 'verified' then 'unverified'::public.verification_status else business_status end
  where id = p_provider_id;

  if v_material_change then
    update public.services set is_active = false where provider_id = p_provider_id;
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'provider.profile_updated',
    'provider_profile',
    p_provider_id::text,
    jsonb_build_object('material_change', v_material_change, 'reverification_required', v_material_change)
  );
end;
$$;

revoke all on function public.update_my_provider_profile(uuid, text, text, text, text, text) from public;
grant execute on function public.update_my_provider_profile(uuid, text, text, text, text, text) to authenticated;
