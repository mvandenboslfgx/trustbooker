-- Public marketplace queries expose only reviewed, non-private fields.
-- Ranking is earned from trust/reputation/service signals; there is no paid boost input.

create or replace function public.search_marketplace(
  p_query text default null,
  p_location text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  display_name text,
  headline text,
  country_code text,
  locality text,
  identity_status public.verification_status,
  business_status public.verification_status,
  trust_score smallint,
  rating numeric,
  review_count integer,
  completed_jobs integer,
  response_minutes integer,
  categories text[],
  starting_price_minor bigint,
  currency text,
  featured_service text,
  rank_score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select
      p.id,
      p.slug,
      p.display_name,
      p.headline,
      p.country_code,
      p.locality,
      p.identity_status,
      p.business_status,
      p.trust_score,
      p.rating,
      p.review_count,
      p.completed_jobs,
      p.response_minutes,
      coalesce(service_categories.categories, array[]::text[]) as categories,
      cheapest.starting_price_minor,
      cheapest.currency,
      cheapest.title as featured_service,
      (
        p.trust_score::numeric * 0.65
        + coalesce(p.rating, 0)::numeric * 5
        + least(p.completed_jobs, 500)::numeric / 25
        + greatest(0::numeric, 10 - coalesce(p.response_minutes, 120)::numeric / 12)
      ) as rank_score
    from public.provider_profiles p
    join public.country_launches launch
      on launch.country_code = p.country_code
     and launch.discovery_enabled = true
    left join lateral (
      select s.title, s.starting_price_minor, s.currency
      from public.services s
      where s.provider_id = p.id and s.is_active = true
      order by s.starting_price_minor asc nulls last, s.created_at asc
      limit 1
    ) cheapest on true
    left join lateral (
      select array_agg(distinct s.category_slug order by s.category_slug) as categories
      from public.services s
      where s.provider_id = p.id and s.is_active = true
    ) service_categories on true
    where p.status = 'active'
      and (
        nullif(trim(p_location), '') is null
        or lower(p.locality) like '%' || lower(trim(p_location)) || '%'
        or p.country_code = upper(trim(p_location))
      )
      and (
        nullif(trim(p_query), '') is null
        or lower(p.display_name) like '%' || lower(trim(p_query)) || '%'
        or lower(p.headline) like '%' || lower(trim(p_query)) || '%'
        or exists (
          select 1
          from public.services s
          where s.provider_id = p.id
            and s.is_active = true
            and (
              lower(s.title) like '%' || lower(trim(p_query)) || '%'
              or lower(s.description) like '%' || lower(trim(p_query)) || '%'
              or lower(s.category_slug) = lower(trim(p_query))
            )
        )
      )
  )
  select *
  from candidates
  order by rank_score desc, review_count desc, completed_jobs desc, id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_marketplace(text, text, integer, integer) from public;
grant execute on function public.search_marketplace(text, text, integer, integer) to anon, authenticated;

create or replace function public.get_public_provider_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'provider', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'display_name', p.display_name,
      'headline', p.headline,
      'description', p.description,
      'country_code', p.country_code,
      'locality', p.locality,
      'identity_status', p.identity_status,
      'business_status', p.business_status,
      'trust_score', p.trust_score,
      'rating', p.rating,
      'review_count', p.review_count,
      'completed_jobs', p.completed_jobs,
      'response_minutes', p.response_minutes
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'category_slug', s.category_slug,
        'title', s.title,
        'description', s.description,
        'starting_price_minor', s.starting_price_minor,
        'currency', s.currency
      ) order by s.starting_price_minor asc nulls last, s.created_at asc)
      from public.services s
      where s.provider_id = p.id and s.is_active = true
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'rating', r.rating,
        'body', r.body,
        'verified_booking', r.verified_booking,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from (
        select r.*
        from public.reviews r
        where r.provider_id = p.id and r.status = 'published'
        order by r.created_at desc
        limit 20
      ) r
    ), '[]'::jsonb)
  )
  from public.provider_profiles p
  join public.country_launches launch
    on launch.country_code = p.country_code
   and launch.discovery_enabled = true
  where p.slug = lower(trim(p_slug))
    and p.status = 'active'
  limit 1;
$$;

revoke all on function public.get_public_provider_profile(text) from public;
grant execute on function public.get_public_provider_profile(text) to anon, authenticated;
