# Staff role bootstrap

TrustBooker intentionally has no self-service admin or moderator promotion.

## Local development

1. Create/sign in with the user normally through Supabase Auth.
2. Find the user's UUID in local Supabase Studio.
3. Run the following only from the trusted local database/admin context:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>'::uuid, 'admin')
on conflict do nothing;
```

Use `moderator` instead of `admin` when full administrative authority is unnecessary.

## Production

Grant staff roles only from an authenticated operational/admin channel with database-level credentials. Never expose a service-role/secret key to the browser, never authorize staff from user-editable metadata, and never add a public RPC that lets a user promote their own account.

Every subsequent provider, review and dispute moderation action is checked against `public.user_roles` inside the database and written to the audit trail.

## Removing access

```sql
delete from public.user_roles
where user_id = '<USER_UUID>'::uuid
  and role in ('admin', 'moderator', 'support');
```

After removing sensitive access, revoke/sign out active sessions as part of the operational offboarding procedure rather than relying only on JWT expiry.
