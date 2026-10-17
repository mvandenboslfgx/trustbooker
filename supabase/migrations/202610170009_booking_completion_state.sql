-- Separate provider completion request from buyer confirmation.
alter type public.booking_status add value if not exists 'completion_pending' before 'completed';
