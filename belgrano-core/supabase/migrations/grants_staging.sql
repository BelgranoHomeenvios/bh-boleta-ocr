-- =====================================================================
-- GRANTS PARA EL ESQUEMA staging
--
-- Cuando un esquema se crea por SQL, los roles de la API de Supabase
-- (service_role, authenticated, anon) no tienen permiso sobre él. La Edge
-- Function escribe con service_role, así que sin estos grants falla al
-- insertar — con el error "[object Object]" que en realidad esconde un
-- "permission denied for schema staging".
--
-- Es el mismo patrón que resolvió rls-usuarios.sql en Belgrano Cost, pero
-- acotado a staging, que es zona de trabajo del catálogo: no lleva RLS
-- porque no tiene datos sensibles (el catálogo de Tienda Nube es público).
--
-- Idempotente.
-- =====================================================================

-- La Edge Function (service_role) tiene que poder escribir.
grant usage on schema staging to service_role;
grant all privileges on all tables    in schema staging to service_role;
grant all privileges on all sequences in schema staging to service_role;

-- Que las tablas nuevas del esquema hereden el permiso.
alter default privileges in schema staging grant all on tables    to service_role;
alter default privileges in schema staging grant all on sequences to service_role;

-- authenticated: para que más adelante la app pueda leer el mapeo y el
-- estado de la sincronización desde una pantalla.
grant usage on schema staging to authenticated;
grant select on all tables in schema staging to authenticated;
alter default privileges in schema staging grant select on tables to authenticated;

-- anon: solo ve el esquema para que la API arranque; sin política, no lee
-- nada (igual que en Belgrano Cost).
grant usage on schema staging to anon;

-- Verificación: qué permisos quedaron.
select grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_schema = 'staging' and grantee in ('service_role','authenticated','anon')
order by grantee, table_name, privilege_type
limit 20;
