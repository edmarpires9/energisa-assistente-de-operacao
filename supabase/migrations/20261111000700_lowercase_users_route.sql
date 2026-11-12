alter table public.route_usage
  drop constraint if exists route_usage_path_check;

update public.route_usage
set path = '/usuarios'
where path = '/Usuarios';

alter table public.route_usage
  add constraint route_usage_path_check
  check (path in ('/inicio', '/EscalaCOD', '/usuarios', '/contatos'));

create or replace function public.increment_route_usage(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record route usage.'
      using errcode = '42501';
  end if;

  if p_path is null or p_path not in (
    '/inicio',
    '/EscalaCOD',
    '/usuarios',
    '/contatos'
  ) then
    raise exception 'Invalid route path.'
      using errcode = '22023';
  end if;

  insert into public.route_usage as usage (path, visit_count, updated_at)
  values (p_path, 1, now())
  on conflict (path)
  do update
  set
    visit_count = usage.visit_count + 1,
    updated_at = now();
end;
$$;
