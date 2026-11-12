create table public.route_usage (
  path text primary key check (
    path in ('/inicio', '/EscalaCOD', '/Usuarios', '/contatos')
  ),
  visit_count bigint not null default 0 check (visit_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.route_usage enable row level security;

revoke all on public.route_usage from anon, authenticated;

create function public.increment_route_usage(p_path text)
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
    '/Usuarios',
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

revoke all on function public.increment_route_usage(text) from public, anon;
grant execute on function public.increment_route_usage(text) to authenticated;
