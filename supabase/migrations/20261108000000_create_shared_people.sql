create table public.people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(btrim(first_name)) > 0),
  last_name text not null check (length(btrim(last_name)) > 0),
  phone1 text not null check (phone1 ~ '^[0-9]{10,13}$'),
  phone2 text check (phone2 is null or phone2 ~ '^[0-9]{10,13}$'),
  contractor text not null check (length(btrim(contractor)) > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default 'Usuário',
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_by_name text not null default 'Usuário',
  updated_at timestamptz not null default now()
);

create index people_name_search_idx
  on public.people (lower(first_name), lower(last_name));

create index people_contractor_search_idx
  on public.people (lower(contractor));

alter table public.people enable row level security;

grant select, insert, update, delete on public.people to authenticated;

create policy "Authenticated users can view people"
  on public.people for select
  to authenticated
  using (true);

create policy "Authenticated users can add people"
  on public.people for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update people"
  on public.people for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

create policy "Authenticated users can delete people"
  on public.people for delete
  to authenticated
  using (true);

create function public.set_people_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to change people.';
  end if;

  actor_name := coalesce(
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

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_by_name := actor_name;
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;

  new.updated_by := auth.uid();
  new.updated_by_name := actor_name;
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_people_audit_fields
  before insert or update on public.people
  for each row
  execute function public.set_people_audit_fields();

revoke all on function public.set_people_audit_fields() from public;
