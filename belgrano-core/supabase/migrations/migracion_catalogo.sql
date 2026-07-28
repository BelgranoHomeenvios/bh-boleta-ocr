-- =====================================================================
-- BELGRANO CORE · MIGRACIÓN DEL CATÁLOGO
-- Desde `rentabilidad.tn_catalogo` (Belgrano Cost) hacia `core.producto`
-- y `core.variante`.
--
-- ⚠ ANTES DE CORRER: pasar el diagnóstico (diagnostico_catalogo_tn.sql) y
--   ajustar la tabla `staging.mapeo_eje` según los nombres de atributo que
--   Tienda Nube use de verdad. Los defaults de acá son una hipótesis.
--
-- Es idempotente: se puede correr de nuevo. Actualiza precios y agrega lo
-- que falte, sin duplicar.
--
-- ORDEN FIJO Y UNIVERSAL de los tres ejes (§Catálogo):
--   1 medida · 2 estructura · 3 frentes/detalles/tapas
-- Se respeta en catálogo, venta, inventario, pedidos y reportes.
-- =====================================================================

create schema if not exists staging;


-- =====================================================================
-- 1 · ESPEJO DEL CATÁLOGO DE TIENDA NUBE
--
-- Si Core y Belgrano Cost son proyectos Supabase DISTINTOS, hay que traer
-- la tabla primero. Dos caminos:
--
--   a) CSV  — exportar `rentabilidad.tn_catalogo` desde Cost e importarlo
--             acá con el importador de Supabase. Es lo más simple.
--   b) FDW  — create extension postgres_fdw; y traerla en vivo. Sirve si
--             se va a sincronizar seguido; para una migración única, no
--             vale la pena.
--
-- Si son el MISMO proyecto, borrar esta tabla y apuntar directo a
-- rentabilidad.tn_catalogo en la sección 4.
-- =====================================================================

create table if not exists staging.tn_catalogo (
  variant_id   bigint primary key,
  product_id   bigint not null,
  nombre       text,
  categoria    text,
  categoria_id bigint,
  atributos    jsonb,
  valores      jsonb,
  sku          text,
  precio       numeric,
  publicado    boolean,
  actualizado  timestamptz
);


-- =====================================================================
-- 2 · MAPEO DE ATRIBUTOS
-- Qué nombre de Tienda Nube corresponde a cada eje de Core.
-- Editable: si el diagnóstico muestra otros nombres, se agregan acá y se
-- vuelve a correr. No hay nada hardcodeado en el resto del script.
-- =====================================================================

create table if not exists staging.mapeo_eje (
  atributo_tn text primary key,
  eje         text not null check (eje in ('medida','estructura','frente','ignorar'))
);

insert into staging.mapeo_eje (atributo_tn, eje) values
  -- Eje 1 · MEDIDA
  ('Medida',        'medida'),
  ('Medidas',       'medida'),
  ('Tamaño',        'medida'),
  ('Ancho',         'medida'),
  -- Eje 2 · ESTRUCTURA
  ('Estructura',    'estructura'),
  ('Color',         'estructura'),      -- cuando el producto tiene un solo color
  ('Material',      'estructura'),
  -- Eje 3 · FRENTES / DETALLES / TAPAS
  ('Tapa',          'frente'),
  ('Frente',        'frente'),
  ('Frentes',       'frente'),
  ('Detalle',       'frente'),
  ('Terminación',   'frente'),
  ('Terminacion',   'frente')
on conflict (atributo_tn) do nothing;

comment on table staging.mapeo_eje is
  'Traduce el nombre del atributo de Tienda Nube al eje de Core. Ajustar según el diagnóstico antes de migrar.';


-- =====================================================================
-- 3 · ATRIBUTOS DESARMADOS
-- `atributos` y `valores` son dos arrays paralelos. Se cruzan por posición
-- (WITH ORDINALITY) y se pivotean a las tres columnas.
-- =====================================================================

create or replace view staging.tn_ejes as
with pares as (
  select
    t.variant_id,
    trim(a.value #>> '{}')  as atributo,
    trim(v.value #>> '{}')  as valor
  from staging.tn_catalogo t
  cross join lateral jsonb_array_elements(coalesce(t.atributos,'[]'::jsonb))
       with ordinality as a(value, pos)
  left join lateral jsonb_array_elements(coalesce(t.valores,'[]'::jsonb))
       with ordinality as v(value, pos) on v.pos = a.pos
)
select
  p.variant_id,
  max(p.valor) filter (where m.eje = 'medida')     as medida,
  max(p.valor) filter (where m.eje = 'estructura') as estructura,
  max(p.valor) filter (where m.eje = 'frente')     as frente,
  -- Atributos que no mapean a ningún eje. Si esto no queda vacío, hay que
  -- completar staging.mapeo_eje antes de dar la migración por buena.
  string_agg(distinct p.atributo, ', ')
    filter (where m.eje is null)                   as sin_mapear
from pares p
left join staging.mapeo_eje m on lower(m.atributo_tn) = lower(p.atributo)
where nullif(p.valor,'') is not null
group by p.variant_id;


-- =====================================================================
-- 4 · MIGRACIÓN
-- =====================================================================

-- 4.1 · PRODUCTOS
-- Un producto por product_id de Tienda Nube. El nombre y la categoría son
-- los mismos para todas sus variantes.
--
-- Tienda Nube es una VISTA PUBLICADA del catálogo, no un catálogo aparte:
-- por eso `publicado_tn` es un atributo del producto, no una tabla separada.
insert into core.producto (categoria, nombre, tipo, publicado_tn, tn_product_id, activo)
select
  coalesce(nullif(trim(t.categoria),''), 'Sin categoría'),
  trim(t.nombre),
  'estandar',
  bool_or(coalesce(t.publicado,false)),
  t.product_id::text,
  true
from staging.tn_catalogo t
where nullif(trim(t.nombre),'') is not null
group by t.product_id, t.categoria, t.nombre
on conflict (categoria, lower(nombre)) do update
  set publicado_tn  = excluded.publicado_tn,
      tn_product_id = excluded.tn_product_id;

-- 4.2 · VARIANTES
-- El precio vive en la variante. Sin proporciones ni fórmulas entre
-- variantes: cada combinación tiene el suyo.
insert into core.variante
  (producto_id, medida, estructura, frente, sku, tn_variant_id, precio, precio_ts, activo)
select
  p.id,
  nullif(e.medida,''),
  nullif(e.estructura,''),
  nullif(e.frente,''),
  nullif(trim(t.sku),''),
  t.variant_id::text,
  t.precio,
  coalesce(t.actualizado, now()),
  true
from staging.tn_catalogo t
join staging.tn_ejes e on e.variant_id = t.variant_id
join core.producto p
  on  p.categoria = coalesce(nullif(trim(t.categoria),''), 'Sin categoría')
  and lower(p.nombre) = lower(trim(t.nombre))
where nullif(trim(t.nombre),'') is not null
on conflict (producto_id, coalesce(medida,''), coalesce(estructura,''), coalesce(frente,''))
do update set
  precio        = excluded.precio,
  precio_ts     = excluded.precio_ts,
  tn_variant_id = excluded.tn_variant_id,
  sku           = coalesce(core.variante.sku, excluded.sku);


-- =====================================================================
-- 5 · VERIFICACIÓN — correr SIEMPRE después de migrar
-- =====================================================================

-- 5.1 · Cuánto entró
select
  (select count(*) from staging.tn_catalogo)                          as tn_variantes,
  (select count(distinct product_id) from staging.tn_catalogo)        as tn_productos,
  (select count(*) from core.variante where tn_variant_id is not null) as core_variantes,
  (select count(*) from core.producto where tn_product_id is not null) as core_productos;

-- 5.2 · ⚠ ATRIBUTOS SIN MAPEAR
-- Si devuelve filas, hay atributos de Tienda Nube que no cayeron en ningún
-- eje: esas variantes quedaron incompletas. Agregarlos a staging.mapeo_eje
-- y volver a correr la sección 4.
select sin_mapear, count(*) as variantes
from staging.tn_ejes
where sin_mapear is not null
group by sin_mapear order by 2 desc;

-- 5.3 · Variantes que perdieron todos sus ejes (posible pérdida de datos)
select t.variant_id, t.nombre, t.atributos, t.valores
from staging.tn_catalogo t
join staging.tn_ejes e on e.variant_id = t.variant_id
where e.medida is null and e.estructura is null and e.frente is null
  and jsonb_array_length(coalesce(t.atributos,'[]'::jsonb)) > 0
limit 20;

-- 5.4 · Colisiones: dos variantes de TN que caen en la misma combinación
select p.nombre, v.medida, v.estructura, v.frente, count(*) as veces
from core.variante v join core.producto p on p.id = v.producto_id
group by 1,2,3,4 having count(*) > 1;

-- 5.5 · Muestra final, como se va a ver en el sistema
select p.categoria, p.nombre, v.medida, v.estructura, v.frente, v.precio, v.sku
from core.variante v join core.producto p on p.id = v.producto_id
order by p.categoria, p.nombre, v.medida, v.estructura, v.frente
limit 25;
