-- Local/internal testing only. Payments and payouts remain closed by default.
insert into public.country_launches (
  country_code,
  discovery_enabled,
  requests_enabled,
  booking_enabled,
  payments_enabled,
  payouts_enabled,
  disputes_enabled
) values (
  'GB',
  true,
  true,
  true,
  false,
  false,
  false
)
on conflict (country_code) do update set
  discovery_enabled = excluded.discovery_enabled,
  requests_enabled = excluded.requests_enabled,
  booking_enabled = excluded.booking_enabled,
  payments_enabled = excluded.payments_enabled,
  payouts_enabled = excluded.payouts_enabled,
  disputes_enabled = excluded.disputes_enabled;
