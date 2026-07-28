-- =====================================================================
-- BELGRANO CORE · JERARQUÍA DE CATEGORÍAS
-- Correr después del bloque 4. Idempotente.
--
-- El catálogo se organiza como en Tienda Nube, por la rama ESPACIOS:
--   ambiente (DORMITORIO) → tipo de mueble (CÓMODAS) → modelo → variante
--
-- El tercer nivel —CÓMODAS, MESAS DE LUZ, PLACARD, RESPALDOS…— es el que el
-- ERP usa de verdad: por ahí va el stock mínimo, la asignación de proveedor
-- y los pedidos. Las categorías comerciales de Tienda Nube (ESTILOS, OUTLET,
-- LOS MÁS VENDIDOS…) NO entran acá: son etiquetas transversales, para la
-- etapa de marketing. Quedan en staging por si se suman después.
-- =====================================================================

set search_path = core, public;

-- Árbol de categorías, auto-referenciado.
create table if not exists categoria (
  id       bigint generated always as identity primary key,
  tn_id    bigint unique,               -- id en Tienda Nube
  nombre   text not null,
  padre_id bigint references categoria(id),
  nivel    smallint,                    -- 1 ESPACIOS · 2 ambiente · 3 tipo de mueble
  orden    integer not null default 0,
  activa   boolean not null default true
);

create index if not exists categoria_padre_idx on categoria (padre_id);

comment on table categoria is
  'Jerarquía estructural del catálogo (rama ESPACIOS de Tienda Nube): ambiente → tipo de mueble. Las categorías comerciales no viven acá.';

-- El producto cuelga de su tipo de mueble (la hoja de ESPACIOS).
alter table producto add column if not exists categoria_id bigint references categoria(id);
create index if not exists producto_categoria_idx on producto (categoria_id);

comment on column producto.categoria_id is
  'Tipo de mueble al que pertenece el producto (CÓMODAS, PLACARD…). La columna categoria (texto) queda como respaldo de lo que trae Tienda Nube.';
