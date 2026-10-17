-- TrustBooker owner operations snapshot.
-- Admin-only, read-only, real data. Do not alter launch/payment flags.
-- Security invariant: neither anon nor authenticated non-admins can see these aggregates.
create or replace function public.get_admin_operations_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_actor and ur.role = 'admin'::public.account_role
  ) then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'captured_at', now(),
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'providers', (select count(*) from public.provider_profiles),
      'active_providers', (select count(*) from public.provider_profiles where status='active'),
      'services', (select count(*) from public.services),
      'published_services', (select count(*) from public.services where is_active),
      'requests', (select count(*) from public.service_requests),
      'proposals', (select count(*) from public.proposals),
      'bookings', (select count(*) from public.bookings),
      'completed_bookings', (select count(*) from public.bookings where status='completed'),
      'reviews', (select count(*) from public.reviews),
      'pending_provider_checks', (select count(*) from public.provider_profiles
        where identity_status = 'pending' or business_status = 'pending'),
      'pending_reviews', (select count(*) from public.reviews where status='pending'),
      'open_disputes', (select count(*) from public.disputes where status not in ('resolved','closed')),
      'open_reports', (select count(*) from public.reports where status in ('open','triaged'))
    ),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', l.country_code,
        'discovery', l.discovery_enabled,
        'requests', l.requests_enabled,
        'bookings', l.booking_enabled,
        'payments', l.payments_enabled,
        'payouts', l.payouts_enabled,
        'disputes', l.disputes_enabled,
        'updated_at', l.updated_at
      ) order by l.country_code)
      from public.country_launches l
    ), '[]'::jsonb),
    'recent_providers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', provider.id,
        'name', provider.display_name,
        'slug', provider.slug,
        'country', provider.country_code,
        'locality', provider.locality,
        'status', provider.status,
        'identity', provider.identity_status,
        'business', provider.business_status,
        'created_at', provider.created_at,
        'services', (select count(*) from public.services s where s.provider_id=provider.id)
      ) order by provider.created_at desc)
      from (
        select p.* from public.provider_profiles p
        order by p.created_at desc, p.id desc
        limit 8
      ) provider
    ), '[]'::jsonb),
    'recent_services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sr.id,
        'title', sr.title,
        'category', sr.category_slug,
        'provider', provider.display_name,
        'is_active', sr.is_active,
        'created_at', sr.created_at
      ) order by sr.created_at desc)
      from (
        select s.* from public.services s
        order by s.created_at desc, s.id desc
        limit 8
      ) sr
      join public.provider_profiles provider on provider.id=sr.provider_id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'action', recent.action,
        'entity_type', recent.entity_type,
        'created_at', recent.created_at
      ) order by recent.created_at desc)
      from (
        select a.id,a.action,a.entity_type,a.created_at
        from public.audit_events a
        order by a.created_at desc, a.id desc
        limit 12
      ) recent
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_admin_operations_snapshot() from public, anon, authenticated;
grant execute on function public.get_admin_operations_snapshot() to authenticated;
comment on function public.get_admin_operations_snapshot()
is 'Admin-only read-only snapshot for the TrustBooker operations workspace. Does not expose user contact details or audit metadata.';
