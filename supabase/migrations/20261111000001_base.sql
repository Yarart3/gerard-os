-- Base: esquema privado con helpers (no expuesto por la API) y keepalive.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- Aplica a una tabla "propia" del usuario: RLS + 4 políticas user_id = auth.uid(),
-- trigger de updated_at, índice por user_id y permisos solo para usuarios autenticados.
create or replace function private.own_table(tbl regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  rel text := (select c.relname from pg_class c where c.oid = tbl);
begin
  execute format('alter table %s enable row level security', tbl);
  execute format('create policy own_select on %s for select to authenticated using (user_id = (select auth.uid()))', tbl);
  execute format('create policy own_insert on %s for insert to authenticated with check (user_id = (select auth.uid()))', tbl);
  execute format('create policy own_update on %s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tbl);
  execute format('create policy own_delete on %s for delete to authenticated using (user_id = (select auth.uid()))', tbl);
  execute format('create trigger set_updated_at before update on %s for each row execute function private.set_updated_at()', tbl);
  execute format('create index if not exists %I on %s (user_id)', rel || '_user_id_idx', tbl);
  execute format('revoke all on %s from anon', tbl);
  execute format('grant select, insert, update, delete on %s to authenticated', tbl);
end
$$;

-- Consulta mínima para que el proyecto gratuito no se pause (keepalive.yml).
create or replace function public.keepalive()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;
grant execute on function public.keepalive() to anon, authenticated;

-- Ajustes: una fila por sección.
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  section text not null check (section in ('general', 'today', 'gym', 'agenda', 'english', 'personal')),
  data jsonb not null default '{}'::jsonb,
  unique (user_id, section)
);
select private.own_table('public.settings');
