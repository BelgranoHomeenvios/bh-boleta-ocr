-- =====================================================================
-- ACCESO DE DESARROLLO AL ESQUEMA core
--
-- ⚠ TEMPORAL. Esto abre core para poder construir el front con el selector
--   "ver como", SIN login real todavía. Cuando llegue Supabase Auth, se
--   reemplaza por políticas RLS por rol (un vendedor no ve un costo, etc.).
--   finanzas y audit NO se tocan: siguen cerrados.
--
-- Antes de correr esto: Settings → API → Exposed schemas → agregar 'core'.
--
-- Idempotente.
-- =====================================================================

-- Permisos para los roles de la API sobre core.
grant usage on schema core to anon, authenticated;
grant all privileges on all tables    in schema core to anon, authenticated;
grant all privileges on all sequences in schema core to anon, authenticated;
alter default privileges in schema core grant all on tables    to anon, authenticated;
alter default privileges in schema core grant all on sequences to anon, authenticated;

-- RLS encendido en todas las tablas de core, con una política de desarrollo
-- que permite todo. La política es lo único que se reemplaza cuando llegue
-- el login: la estructura ya queda lista para el RLS real.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='core' loop
    execute format('alter table core.%I enable row level security', r.tablename);
    execute format('drop policy if exists dev_todo on core.%I', r.tablename);
    execute format(
      'create policy dev_todo on core.%I for all to anon, authenticated using (true) with check (true)',
      r.tablename);
  end loop;
end $$;

comment on schema core is
  'DEV: abierto a anon/authenticated con política permisiva. Reemplazar por RLS por rol al activar el login.';
