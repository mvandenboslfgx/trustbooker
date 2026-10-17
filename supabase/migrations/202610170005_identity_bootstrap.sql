-- TrustBooker identity bootstrap.
-- Every authenticated account receives a private marketplace profile and buyer role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    100
  );

  if char_length(v_display_name) < 2 then
    v_display_name := 'Member';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'buyer')
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill accounts created before this migration without weakening RLS.
insert into public.profiles (id, display_name)
select
  u.id,
  case
    when char_length(left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Member'), 100)) >= 2
      then left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Member'), 100)
    else 'Member'
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.user_roles (user_id, role)
select u.id, 'buyer'::public.account_role
from auth.users u
on conflict do nothing;
