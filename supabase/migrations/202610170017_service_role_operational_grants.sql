-- TrustBooker service-role Data API permissions.
--
-- RLS bypass does not replace PostgreSQL table privileges. Keep this allowlist
-- intentionally small: service_role is used only by trusted server/operations
-- code and integration setup, never by browser clients.

revoke all on public.provider_profiles from service_role;
revoke all on public.user_roles from service_role;
revoke all on public.bookings from service_role;

grant select, insert on public.provider_profiles to service_role;
grant select on public.user_roles to service_role;
grant select on public.bookings to service_role;
