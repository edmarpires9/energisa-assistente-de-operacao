alter table public.companies
  add column if not exists icon text not null default 'factory',
  add column if not exists color text not null default '#000000';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_icon_allowed_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_icon_allowed_check
      check (icon in ('factory', 'cog', 'power-generator', 'gear-hammer'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_color_hex_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_color_hex_check
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;
