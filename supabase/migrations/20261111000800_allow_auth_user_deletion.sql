create or replace function public.set_people_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_auth_sync boolean;
  is_foreign_key_action boolean;
  actor_id uuid;
  actor_name text;
begin
  is_auth_sync := current_setting('app.syncing_auth_user', true) = 'true';
  is_foreign_key_action := pg_trigger_depth() > 1;
  if auth.uid() is null and not is_auth_sync and not is_foreign_key_action then
    raise exception 'Authentication is required to change people.';
  end if;

  actor_id := coalesce(
    auth.uid(),
    nullif(current_setting('app.syncing_user_id', true), '')::uuid
  );
  actor_name := coalesce(
    nullif(current_setting('app.syncing_user_name', true), ''),
    nullif(
      btrim(
        concat_ws(
          ' ',
          auth.jwt() -> 'user_metadata' ->> 'first_name',
          auth.jwt() -> 'user_metadata' ->> 'last_name'
        )
      ),
      ''
    ),
    nullif(auth.jwt() ->> 'email', ''),
    'Usuário'
  );

  if is_auth_sync then
    new.auth_user_id := actor_id;
  elsif tg_op = 'INSERT' then
    new.auth_user_id := null;
  elsif not is_foreign_key_action then
    new.auth_user_id := old.auth_user_id;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor_id;
    new.created_by_name := actor_name;
    new.created_at := now();
  elsif not is_foreign_key_action then
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;

  if not is_foreign_key_action then
    new.updated_by := actor_id;
    new.updated_by_name := actor_name;
    new.updated_at := now();
  end if;

  return new;
end;
$$;
