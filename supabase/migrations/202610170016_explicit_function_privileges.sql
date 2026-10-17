-- Supabase/Postgres functions are executable by PUBLIC by default. Remove implicit
-- access and explicitly allow only the RPC surfaces TrustBooker intends to expose.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.reject_financial_event_mutation() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.ensure_booking_conversation() from public, anon, authenticated;
revoke execute on function public.recalculate_provider_reputation(uuid) from public, anon, authenticated;
revoke execute on function public.reputation_after_booking_change() from public, anon, authenticated;
revoke execute on function public.reputation_after_provider_verification() from public, anon, authenticated;

revoke execute on function public.search_marketplace(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_marketplace(text, text, integer, integer) to anon, authenticated;

revoke execute on function public.get_public_provider_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_provider_profile(text) to anon, authenticated;

revoke execute on function public.bootstrap_provider_profile(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.bootstrap_provider_profile(text, text, text, text, text, text) to authenticated;

revoke execute on function public.create_provider_service(uuid, text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.create_provider_service(uuid, text, text, text, bigint, text) to authenticated;

revoke execute on function public.get_my_provider_profile() from public, anon, authenticated;
grant execute on function public.get_my_provider_profile() to authenticated;

revoke execute on function public.accept_proposal_and_create_booking(uuid) from public, anon, authenticated;
grant execute on function public.accept_proposal_and_create_booking(uuid) to authenticated;

revoke execute on function public.get_my_roles() from public, anon, authenticated;
grant execute on function public.get_my_roles() to authenticated;

revoke execute on function public.update_my_provider_profile(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_my_provider_profile(uuid, text, text, text, text, text) to authenticated;

revoke execute on function public.submit_provider_for_review(uuid) from public, anon, authenticated;
grant execute on function public.submit_provider_for_review(uuid) to authenticated;

revoke execute on function public.set_provider_service_active(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_provider_service_active(uuid, boolean) to authenticated;

revoke execute on function public.list_provider_review_queue() from public, anon, authenticated;
grant execute on function public.list_provider_review_queue() to authenticated;

revoke execute on function public.moderate_provider(uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_provider(uuid, text) to authenticated;

revoke execute on function public.transition_booking(uuid, text) from public, anon, authenticated;
grant execute on function public.transition_booking(uuid, text) to authenticated;

revoke execute on function public.open_booking_dispute(uuid, text) from public, anon, authenticated;
grant execute on function public.open_booking_dispute(uuid, text) to authenticated;

revoke execute on function public.get_booking_workspace(uuid) from public, anon, authenticated;
grant execute on function public.get_booking_workspace(uuid) to authenticated;

revoke execute on function public.list_pending_reviews() from public, anon, authenticated;
grant execute on function public.list_pending_reviews() to authenticated;

revoke execute on function public.moderate_review(uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_review(uuid, text) to authenticated;

revoke execute on function public.list_open_disputes() from public, anon, authenticated;
grant execute on function public.list_open_disputes() to authenticated;

revoke execute on function public.resolve_dispute(uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
