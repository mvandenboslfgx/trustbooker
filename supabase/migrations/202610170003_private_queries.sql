-- TrustBooker controlled private query functions.
-- Apply after schema.sql and commands.sql.

create or replace function public.get_my_provider_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(profile_row)
  from (
    select
      p.id,
      p.slug,
      p.display_name,
      p.headline,
      p.description,
      p.country_code,
      p.locality,
      p.status,
      p.identity_status,
      p.business_status,
      p.trust_score,
      p.rating,
      p.review_count,
      p.completed_jobs,
      p.response_minutes
    from public.provider_profiles p
    where p.owner_user_id = auth.uid()
    order by p.created_at desc
    limit 1
  ) as profile_row;
$$;

revoke all on function public.get_my_provider_profile() from public;
grant execute on function public.get_my_provider_profile() to authenticated;
