-- =====================================================================
-- BELGRANO CORE · BÚSQUEDA SIN TILDES
-- Que "comoda" encuentre "CÓMODA", "living" encuentre "LIVING", etc.
-- Idempotente: se puede correr las veces que haga falta.
--
-- Cómo: una columna generada `nombre_norm` que guarda el nombre sin tildes
-- y en minúscula. El front busca contra esa columna. Índice trigram para
-- que el ilike '%texto%' sea rápido sobre los ~630 productos.
-- =====================================================================

create extension if not exists unaccent;
create extension if not exists pg_trgm;

set search_path = core, public;

-- unaccent() es STABLE, y una columna generada exige una función IMMUTABLE.
-- Envolvemos unaccent en un wrapper inmutable (patrón estándar y seguro:
-- el diccionario de unaccent no cambia en la práctica).
create or replace function core.f_unaccent(text)
  returns text
  language sql
  immutable
  strict
  parallel safe
as $$ select unaccent('unaccent', $1) $$;

-- La columna normalizada. Si ya existía de una corrida previa, no se toca.
alter table core.producto
  add column if not exists nombre_norm text
  generated always as (lower(core.f_unaccent(nombre))) stored;

-- Índice trigram para acelerar el ilike '%…%'.
create index if not exists producto_nombre_norm_trgm
  on core.producto using gin (nombre_norm gin_trgm_ops);

comment on column core.producto.nombre_norm is
  'Nombre sin tildes y en minúscula, para búsqueda que ignora acentos. Se mantiene sola (columna generada).';

-- Verificación rápida: debería devolver CÓMODA… buscando "comoda".
-- select nombre from core.producto where nombre_norm like '%comoda%' limit 5;
