-- Allow a buyer to read their own review submission (including pending state)
-- without exposing buyer_id publicly. Public users still only see published,
-- verified reviews through the existing public policy.

grant select (status) on public.reviews to authenticated;

drop policy if exists reviews_buyer_read_own on public.reviews;
create policy reviews_buyer_read_own on public.reviews
  for select to authenticated
  using (buyer_id = (select auth.uid()));
