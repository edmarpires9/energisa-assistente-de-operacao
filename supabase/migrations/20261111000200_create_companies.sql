create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 150)
);

create unique index companies_name_unique_idx
  on public.companies (lower(btrim(name)));

alter table public.companies enable row level security;

grant select, insert, update, delete on public.companies to authenticated;

create policy "Authenticated users can view companies"
  on public.companies for select
  to authenticated
  using (true);

create policy "Authenticated users can add companies"
  on public.companies for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update companies"
  on public.companies for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

create policy "Authenticated users can delete companies"
  on public.companies for delete
  to authenticated
  using (true);
