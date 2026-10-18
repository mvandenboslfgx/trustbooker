-- Consent-based applicant contact details: never expose account emails by default.
alter table public.job_applications add column contact_email text;
alter table public.job_applications add constraint job_applications_contact_email_check
check (contact_email is null or (char_length(contact_email) between 5 and 254 and contact_email like '%@%'));

grant insert (contact_email) on public.job_applications to authenticated;

drop policy if exists applications_create on public.job_applications;
create policy applications_create on public.job_applications
for insert to authenticated
with check (
 applicant_user_id=(select auth.uid())
 and contact_email is not null
 and lower(contact_email)=lower((select auth.jwt()->>'email'))
 and exists (
  select 1
  from public.job_listings j
  join public.vertical_launches v on v.country_code=j.country_code
  where j.id=job_id and j.status='published' and v.jobs_enabled
    and j.owner_user_id<>(select auth.uid())
 )
);
comment on column public.job_applications.contact_email
is 'Verified account email; shared only when an applicant explicitly agrees during the application form. RLS restricts reads to applicant and hiring owner.';
