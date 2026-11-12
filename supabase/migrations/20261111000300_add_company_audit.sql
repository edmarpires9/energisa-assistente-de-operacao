alter table public.companies
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_by_name text not null default 'Usuário',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by_name text not null default 'Usuário',
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_company_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to change companies.';
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

drop trigger if exists set_company_audit_fields on public.companies;

create trigger set_company_audit_fields
  before insert or update on public.companies
  for each row
  execute function public.set_company_audit_fields();

revoke all on function public.set_company_audit_fields() from public;
