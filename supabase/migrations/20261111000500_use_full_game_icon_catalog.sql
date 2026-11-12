alter table public.companies
  alter column icon set default 'delapouite/factory',
  drop constraint if exists companies_icon_allowed_check;

drop trigger if exists set_company_audit_fields on public.companies;

update public.companies
set icon = case icon
  when 'factory' then 'delapouite/factory'
  when 'cog' then 'lorc/cog'
  when 'power-generator' then 'delapouite/power-generator'
  when 'gear-hammer' then 'lorc/gear-hammer'
  else 'delapouite/factory'
end
where icon !~ '^[a-z0-9-]+/[a-z0-9-]+$';

alter table public.companies
  add constraint companies_icon_allowed_check
  check (icon ~ '^[a-z0-9-]+/[a-z0-9-]+$');

create trigger set_company_audit_fields
  before insert or update on public.companies
  for each row
  execute function public.set_company_audit_fields();
