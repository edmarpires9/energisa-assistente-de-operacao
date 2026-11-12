alter table public.people
  add column auth_user_id uuid unique references auth.users (id) on delete set null;

alter table public.people
  alter column phone1 drop not null,
  alter column contractor set default 'Não informada';

create or replace function public.set_people_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_auth_sync boolean;
  actor_id uuid;
  actor_name text;
begin
  is_auth_sync := current_setting('app.syncing_auth_user', true) = 'true';
  if auth.uid() is null and not is_auth_sync then
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
  else
    new.auth_user_id := old.auth_user_id;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor_id;
    new.created_by_name := actor_name;
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;

  new.updated_by := actor_id;
  new.updated_by_name := actor_name;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_auth_user_to_person(
  p_user_id uuid,
  p_email text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  legacy_name text;
  user_first_name text;
  user_last_name text;
  user_name text;
  user_phone1 text;
  user_phone2 text;
  user_company text;
begin
  legacy_name := btrim(coalesce(p_metadata ->> 'name', ''));
  user_first_name := coalesce(
    nullif(btrim(p_metadata ->> 'first_name'), ''),
    nullif(split_part(legacy_name, ' ', 1), ''),
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    'Usuário'
  );
  user_last_name := coalesce(
    nullif(btrim(p_metadata ->> 'last_name'), ''),
    nullif(
      btrim(substr(legacy_name, length(split_part(legacy_name, ' ', 1)) + 1)),
      ''
    ),
    'Não informado'
  );
  user_name := coalesce(
    nullif(btrim(concat_ws(' ', user_first_name, user_last_name)), ''),
    p_email,
    'Usuário'
  );

  user_phone1 := regexp_replace(
    coalesce(p_metadata ->> 'ddd', '', '') ||
      coalesce(p_metadata ->> 'telefone', ''),
    '\D',
    '',
    'g'
  );
  if length(user_phone1) not between 10 and 13 then
    user_phone1 := null;
  end if;

  user_phone2 := regexp_replace(
    coalesce(p_metadata ->> 'ddd2', '') ||
      coalesce(p_metadata ->> 'telefone2', ''),
    '\D',
    '',
    'g'
  );
  if length(user_phone2) not between 10 and 13 then
    user_phone2 := null;
  end if;

  user_company := coalesce(
    nullif(btrim(p_metadata ->> 'company'), ''),
    nullif(btrim(p_metadata ->> 'contractor'), ''),
    nullif(btrim(p_metadata ->> 'empreiteira'), ''),
    'Não informada'
  );

  perform set_config('app.syncing_auth_user', 'true', true);
  perform set_config('app.syncing_user_id', p_user_id::text, true);
  perform set_config('app.syncing_user_name', user_name, true);

  insert into public.people (
    auth_user_id,
    first_name,
    last_name,
    phone1,
    phone2,
    contractor,
    created_by,
    created_by_name,
    updated_by,
    updated_by_name
  )
  values (
    p_user_id,
    user_first_name,
    user_last_name,
    user_phone1,
    user_phone2,
    user_company,
    p_user_id,
    user_name,
    p_user_id,
    user_name
  )
  on conflict (auth_user_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone1 = case
      when p_metadata ? 'telefone' then excluded.phone1
      else public.people.phone1
    end,
    phone2 = case
      when p_metadata ? 'telefone2' or p_metadata ? 'ddd2'
        then excluded.phone2
      else public.people.phone2
    end,
    contractor = case
      when p_metadata ? 'company'
        or p_metadata ? 'contractor'
        or p_metadata ? 'empreiteira'
        then excluded.contractor
      else public.people.contractor
    end,
    updated_by = p_user_id,
    updated_by_name = user_name,
    updated_at = now();
end;
$$;

revoke all on function public.sync_auth_user_to_person(uuid, text, jsonb)
  from public, anon, authenticated;

create function public.handle_auth_user_person_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_auth_user_to_person(
    new.id,
    new.email,
    new.raw_user_meta_data
  );
  return new;
end;
$$;

revoke all on function public.handle_auth_user_person_sync()
  from public, anon, authenticated;

create trigger sync_auth_user_to_person
  after insert or update of email, raw_user_meta_data on auth.users
  for each row
  execute function public.handle_auth_user_person_sync();

do $$
declare
  auth_user record;
begin
  for auth_user in
    select id, email, raw_user_meta_data
    from auth.users
  loop
    perform public.sync_auth_user_to_person(
      auth_user.id,
      auth_user.email,
      auth_user.raw_user_meta_data
    );
  end loop;
end;
$$;

create function public.prevent_deleting_linked_person()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.auth_user_id is not null then
    raise exception 'A person linked to a user account cannot be deleted.';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_deleting_linked_person()
  from public, anon, authenticated;

create trigger prevent_deleting_linked_person
  before delete on public.people
  for each row
  execute function public.prevent_deleting_linked_person();
